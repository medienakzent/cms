/**
 * Authentication via Better Auth: local account (email + password) plus OAuth
 * providers enabled through environment variables. Better Auth creates its own
 * tables in the configured database (see init.ts).
 */
import { betterAuth } from 'better-auth';
import { APIError } from 'better-auth/api';
import { admin, twoFactor } from 'better-auth/plugins';
import { createAccessControl } from 'better-auth/plugins/access';
import { adminAc, defaultStatements } from 'better-auth/plugins/admin/access';
import { sendSystemMail } from './mail';
import { getDb } from './db';
import { getRuntime, serverConfig } from './runtime';

export type Role = 'admin' | 'editor';

// CMS roles: admin manages users, editor maintains content. Content permissions are
// enforced by the CMS itself (hook, requireAdmin); the plugin only covers user management.
const accessControl = createAccessControl(defaultStatements);
export const roles = {
	admin: accessControl.newRole({ ...adminAc.statements }),
	editor: accessControl.newRole({})
};

export interface SessionUser {
	id: string;
	name: string;
	email: string;
	image: string;
	role: Role;
	/** true for API keys (no browser account) */
	api?: boolean;
	/** Second factor set up (authenticator app). */
	twoFactorEnabled?: boolean;
}

type AuthDatabase = NonNullable<Parameters<typeof betterAuth>[0]['database']>;

function createAuth(database: AuthDatabase, countUsers: () => Promise<number>) {
	const config = serverConfig();
	const { oauth } = config;
	const socialProviders = {
		...(oauth.github.clientId ? { github: { ...oauth.github } } : {}),
		...(oauth.google.clientId ? { google: { ...oauth.google } } : {}),
		...(oauth.microsoft.clientId ? { microsoft: { ...oauth.microsoft } } : {})
	};

	return betterAuth({
		// Production: fixed base URL (ORIGIN). Development: derived from the request so
		// localhost, container IP and <project>.test all work.
		baseURL: config.isProd ? config.origin : undefined,
		basePath: '/api/auth',
		secret:
			config.authSecret ||
			(config.isProd ? undefined : 'dev-secret-please-set-AUTH_SECRET-0123456789'),
		database,
		// Better Auth's own limiter for /api/auth (login brute force); /api/v1 is limited in hooks.ts.
		rateLimit: { enabled: true, window: 60, max: config.rateLimit.anonPerMinute },
		// Trusted origins: ORIGIN plus the request origin. Behind a proxy (nginx-proxy, Plesk)
		// the request arrives as http while the browser sends https, so X-Forwarded-Proto/-Host
		// count as well; in development both schemes are accepted.
		trustedOrigins: (request?: Request) => {
			const origins = [config.origin, ...config.trustedOrigins];
			if (request && !config.isProd) {
				const url = new URL(request.url);
				const host = request.headers.get('x-forwarded-host')?.split(',')[0].trim() || url.host;
				const proto = request.headers.get('x-forwarded-proto')?.split(',')[0].trim();
				origins.push(`${url.protocol}//${host}`);
				if (proto) origins.push(`${proto}://${host}`);
				if (!config.isProd) origins.push(`http://${host}`, `https://${host}`);
			}
			return [...new Set(origins)];
		},
		emailAndPassword: {
			enabled: true,
			// "Forgot password": link sent via the CMS mail transport, target is /admin/reset.
			sendResetPassword: async ({ user, url }) => {
				await sendSystemMail({
					to: user.email,
					subject: 'Passwort zurücksetzen',
					markdown: `Hallo ${user.name || user.email},\n\nüber diesen Link können Sie ein neues Passwort für das CMS setzen (eine Stunde gültig):\n\n[Passwort zurücksetzen](${url})\n\nFalls Sie das nicht angefordert haben, ignorieren Sie diese Nachricht.`
				});
			},
			resetPasswordTokenExpiresIn: 3600
		},
		plugins: [
			admin({ ac: accessControl, roles, defaultRole: 'editor', adminRoles: ['admin'] }),
			// Only password logins ask for the second factor; OAuth providers bring their own.
			...(config.twoFactor === 'off' ? [] : [twoFactor({ issuer: getRuntime().config.site.name })])
		],
		socialProviders,
		databaseHooks: {
			user: {
				create: {
					// The first user becomes admin (always allowed). Further accounts need ALLOW_SIGNUP=1,
					// so a forgotten setting has no effect once an account exists.
					before: async (user) => {
						const first = (await countUsers()) === 0;
						if (!first && !config.allowSignup) {
							throw new APIError('FORBIDDEN', {
								message:
									'Registrierung ist geschlossen. Bitte einen Administrator um ein Konto bitten.'
							});
						}
						const role: Role = first ? 'admin' : 'editor';
						return { data: { ...user, role } };
					}
				}
			}
		}
	});
}

export type Auth = ReturnType<typeof createAuth>;

let instance: Auth | null = null;

export async function getAuth(): Promise<Auth> {
	if (instance) return instance;
	const db = await getDb();
	// A failing count must abort the signup rather than grant the first-admin role.
	instance = createAuth(db.raw as AuthDatabase, async () => {
		const row = await db.get<{ count: number }>('SELECT COUNT(*) AS count FROM "user"');
		return Number(row?.count ?? 0);
	});
	return instance;
}

export function toSessionUser(user: {
	id: string;
	name: string;
	email: string;
	image?: string | null;
	role?: string | null;
	twoFactorEnabled?: boolean | null;
}): SessionUser {
	return {
		id: user.id,
		name: user.name || user.email,
		email: user.email,
		image: user.image ?? '',
		role: user.role === 'admin' ? 'admin' : 'editor',
		twoFactorEnabled: !!user.twoFactorEnabled
	};
}

export async function getSessionUser(headers: Headers): Promise<SessionUser | null> {
	const auth = await getAuth();
	const session = await auth.api.getSession({ headers });
	return session ? toSessionUser(session.user) : null;
}

/** Whether the user can sign in with a password (only those logins ask for a second factor). */
export async function hasPasswordLogin(userId: string): Promise<boolean> {
	const context = await (await getAuth()).$context;
	const accounts = await context.internalAdapter.findAccounts(userId);
	return accounts.some((account) => account.providerId === 'credential');
}

/** Removes the second factor of a user, e.g. after a lost phone; only for administrators. */
export async function resetTwoFactor(userId: string): Promise<void> {
	if (serverConfig().twoFactor === 'off') return;
	const context = await (await getAuth()).$context;
	await context.adapter.deleteMany({
		model: 'twoFactor',
		where: [{ field: 'userId', value: userId }]
	});
	await context.internalAdapter.updateUser(userId, { twoFactorEnabled: false });
}

/** Available login methods, for the login page. */
export function authOptions() {
	const config = serverConfig();
	const { oauth } = config;
	return {
		signup: config.allowSignup,
		twoFactor: config.twoFactor,
		providers: [
			oauth.github.clientId ? 'github' : null,
			oauth.google.clientId ? 'google' : null,
			oauth.microsoft.clientId ? 'microsoft' : null
		].filter((provider): provider is 'github' | 'google' | 'microsoft' => !!provider)
	};
}
