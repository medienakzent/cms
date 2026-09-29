/**
 * Authentifizierung über Better Auth: lokales Konto (E-Mail + Passwort) und
 * OAuth-Provider, die per Umgebungsvariablen aktiviert werden. Tabellen legt
 * Better Auth selbst in der konfigurierten Datenbank an (siehe init.ts).
 */
import { betterAuth } from 'better-auth';
import { APIError } from 'better-auth/api';
import { admin } from 'better-auth/plugins';
import { createAccessControl } from 'better-auth/plugins/access';
import { adminAc, defaultStatements } from 'better-auth/plugins/admin/access';
import { sendSystemMail } from './mail';
import { getDb } from './db';
import { serverConfig } from './runtime';

export type Role = 'admin' | 'editor';

// Rollen des CMS: admin verwaltet Nutzer, editor pflegt Inhalte. Zugriffsrechte auf
// Inhalte prüft das CMS selbst (Hook, requireAdmin); das Plugin regelt nur die Nutzerverwaltung.
const ac = createAccessControl(defaultStatements);
export const roles = {
	admin: ac.newRole({ ...adminAc.statements }),
	editor: ac.newRole({})
};

export interface SessionUser {
	id: string;
	name: string;
	email: string;
	image: string;
	role: Role;
}

function createAuth(database: unknown, countUsers: () => Promise<number>) {
	const cfg = serverConfig();
	const { oauth } = cfg;
	const socialProviders = {
		...(oauth.github.clientId ? { github: { ...oauth.github } } : {}),
		...(oauth.google.clientId ? { google: { ...oauth.google } } : {}),
		...(oauth.microsoft.clientId ? { microsoft: { ...oauth.microsoft } } : {})
	};

	return betterAuth({
		// Produktion: feste Basis-URL (ORIGIN). Entwicklung: aus der Anfrage ableiten,
		// damit localhost, Container-IP und <projekt>.test gleichermaßen funktionieren.
		baseURL: cfg.isProd ? cfg.origin : undefined,
		basePath: '/api/auth',
		secret:
			cfg.authSecret || (cfg.isProd ? undefined : 'dev-secret-please-set-AUTH_SECRET-0123456789'),
		// better-sqlite3 Database bzw. pg Pool — Better Auth erkennt beide.
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		database: database as any,
		// Eigener Limiter von Better Auth für /api/auth (Login-Brute-Force); /api/v1 limitiert hooks.server.ts.
		rateLimit: { enabled: true, window: 60, max: cfg.rateLimit.anonPerMinute },
		// Vertrauenswürdige Origins: ORIGIN plus die Origin der Anfrage. Hinter einem
		// Proxy (nginx-proxy, Plesk) kommt die Anfrage als http an, der Browser sendet aber
		// https — deshalb zählen X-Forwarded-Proto/-Host mit; in der Entwicklung beide Schemata.
		trustedOrigins: (request?: Request) => {
			const list = [cfg.origin];
			if (request) {
				const url = new URL(request.url);
				const host = request.headers.get('x-forwarded-host')?.split(',')[0].trim() || url.host;
				const proto = request.headers.get('x-forwarded-proto')?.split(',')[0].trim();
				list.push(`${url.protocol}//${host}`);
				if (proto) list.push(`${proto}://${host}`);
				if (!cfg.isProd) list.push(`http://${host}`, `https://${host}`);
			}
			return [...new Set(list)];
		},
		emailAndPassword: {
			enabled: true,
			// „Passwort vergessen": Link per Mail über den CMS-Transport; Ziel ist /admin/reset.
			sendResetPassword: async ({ user, url }) => {
				await sendSystemMail({
					to: user.email,
					subject: 'Passwort zurücksetzen',
					markdown: `Hallo ${user.name || user.email},\n\nüber diesen Link können Sie ein neues Passwort für das CMS setzen (eine Stunde gültig):\n\n[Passwort zurücksetzen](${url})\n\nFalls Sie das nicht angefordert haben, ignorieren Sie diese Nachricht.`
				});
			},
			resetPasswordTokenExpiresIn: 3600
		},
		// Nutzerverwaltung (Rollen, Anlegen, Entfernen) — Rolle „admin" darf verwalten.
		plugins: [admin({ ac, roles, defaultRole: 'editor', adminRoles: ['admin'] })],
		socialProviders,
		databaseHooks: {
			user: {
				create: {
					// Erster Nutzer wird Admin (immer möglich). Weitere Konten nur mit ALLOW_SIGNUP=1 —
					// so bleibt eine vergessene Einstellung folgenlos, sobald ein Konto existiert.
					before: async (user) => {
						const first = (await countUsers()) === 0;
						if (!first && !cfg.allowSignup) {
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
	instance = createAuth(db.raw, async () => {
		try {
			const row = await db.get<{ n: number }>('SELECT COUNT(*) AS n FROM "user"');
			return Number(row?.n ?? 0);
		} catch {
			return 0;
		}
	});
	return instance;
}

export function toSessionUser(user: {
	id: string;
	name: string;
	email: string;
	image?: string | null;
	role?: string | null;
}): SessionUser {
	return {
		id: user.id,
		name: user.name || user.email,
		email: user.email,
		image: user.image ?? '',
		role: user.role === 'admin' ? 'admin' : 'editor'
	};
}

export async function getSessionUser(headers: Headers): Promise<SessionUser | null> {
	const auth = await getAuth();
	const session = await auth.api.getSession({ headers });
	return session ? toSessionUser(session.user) : null;
}

/** Welche Login-Wege stehen zur Verfügung (für die Login-Seite). */
export function authOptions() {
	const cfg = serverConfig();
	const { oauth } = cfg;
	return {
		// Anzeige im Login: Registrierung ist offen, wenn erlaubt oder noch kein Konto existiert (siehe hooks).
		signup: cfg.allowSignup,
		providers: [
			oauth.github.clientId ? 'github' : null,
			oauth.google.clientId ? 'google' : null,
			oauth.microsoft.clientId ? 'microsoft' : null
		].filter((p): p is 'github' | 'google' | 'microsoft' => !!p)
	};
}
