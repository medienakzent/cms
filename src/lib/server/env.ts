/**
 * Server configuration from environment variables. Built ONCE at startup
 * (createHandle); the package never reads `$env` itself.
 */
export type Env = Record<string, string | undefined>;

function positiveNumber(value: string | undefined, fallback: number): number {
	const parsed = Number(value);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const MAIL_TRANSPORTS = ['file', 'smtp', 'microsoft', 'google'] as const;
type MailTransportName = (typeof MAIL_TRANSPORTS)[number];

function mailTransport(value: string | undefined): MailTransportName {
	if (!value) return 'file';
	if ((MAIL_TRANSPORTS as readonly string[]).includes(value)) return value as MailTransportName;
	throw new Error(
		`MAIL_TRANSPORT „${value}" ist unbekannt. Erlaubt: ${MAIL_TRANSPORTS.join(', ')}`
	);
}

const TWO_FACTOR_MODES = ['off', 'optional', 'required'] as const;
export type TwoFactorMode = (typeof TWO_FACTOR_MODES)[number];

function twoFactorMode(value: string | undefined): TwoFactorMode {
	if (!value) return 'off';
	if ((TWO_FACTOR_MODES as readonly string[]).includes(value)) return value as TwoFactorMode;
	throw new Error(`TWO_FACTOR „${value}" ist unbekannt. Erlaubt: ${TWO_FACTOR_MODES.join(', ')}`);
}

function timeZone(value: string | undefined): string {
	const zone = value || 'Europe/Berlin';
	try {
		new Intl.DateTimeFormat('de-DE', { timeZone: zone });
	} catch {
		throw new Error(`ANALYTICS_TIMEZONE „${zone}" ist keine gültige Zeitzone`);
	}
	return zone;
}

function list(value: string | undefined): string[] {
	return (value ?? '')
		.split(',')
		.map((entry) => entry.trim())
		.filter(Boolean);
}

export function buildServerConfig(env: Env) {
	const isProd = env.NODE_ENV === 'production';
	const config = {
		isProd,
		dataDir: env.DATA_DIR || 'data',
		storageDir: env.STORAGE_DIR || 'storage',
		origin: (env.ORIGIN || 'http://localhost:5173').replace(/\/+$/, ''),
		databaseUrl: env.DATABASE_URL || 'sqlite:cms.db',
		authSecret: env.AUTH_SECRET || '',
		allowSignup: env.ALLOW_SIGNUP === '1',
		/** Second factor for password logins: off | optional (each user decides) | required. */
		twoFactor: twoFactorMode(env.TWO_FACTOR),
		trustedOrigins: list(env.TRUSTED_ORIGINS).map((origin) => origin.replace(/\/+$/, '')),
		apiToken: env.API_TOKEN || '',
		maxUploadBytes: positiveNumber(env.MAX_UPLOAD_MB, 200) * 1024 * 1024,
		oauth: {
			github: {
				clientId: env.GITHUB_CLIENT_ID || '',
				clientSecret: env.GITHUB_CLIENT_SECRET || ''
			},
			google: {
				clientId: env.GOOGLE_CLIENT_ID || '',
				clientSecret: env.GOOGLE_CLIENT_SECRET || ''
			},
			microsoft: {
				clientId: env.MICROSOFT_CLIENT_ID || '',
				clientSecret: env.MICROSOFT_CLIENT_SECRET || '',
				tenantId: env.MICROSOFT_TENANT_ID || 'common'
			}
		},
		mail: {
			/** file (default, stored in the storage) | smtp | microsoft | google */
			transport: mailTransport(env.MAIL_TRANSPORT),
			from: env.MAIL_FROM || 'CMS <noreply@localhost>',
			defaultTo: list(env.MAIL_TO_DEFAULT),
			smtpUrl: env.SMTP_URL || '',
			microsoft: {
				tenantId: env.MS_MAIL_TENANT_ID || '',
				clientId: env.MS_MAIL_CLIENT_ID || '',
				clientSecret: env.MS_MAIL_CLIENT_SECRET || '',
				sender: env.MS_MAIL_SENDER || ''
			},
			google: {
				serviceAccountFile: env.GOOGLE_MAIL_SERVICE_ACCOUNT || '',
				sender: env.GOOGLE_MAIL_SENDER || ''
			},
			/** Retention of uploaded form files in days; 0 = unlimited. */
			uploadRetentionDays:
				env.MAIL_UPLOAD_RETENTION_DAYS === '0'
					? 0
					: positiveNumber(env.MAIL_UPLOAD_RETENTION_DAYS, 180)
		},
		captcha: {
			/** ALTCHA is always on; CAPTCHA=0 only for tests. */
			enabled: env.CAPTCHA !== '0',
			/** HMAC secret for challenges (default: AUTH_SECRET) */
			secret: env.CAPTCHA_SECRET || env.AUTH_SECRET || 'dev-captcha-secret',
			/** Proof-of-work cost (PBKDF2 iterations); higher = more protection, slower */
			cost: positiveNumber(env.ALTCHA_COST, 1000)
		},
		analytics: {
			/** Cookieless visitor statistics; ANALYTICS=0 switches collection off. */
			enabled: env.ANALYTICS !== '0',
			/** Raw visits are deleted after this many days. */
			retentionDays: positiveNumber(env.ANALYTICS_RETENTION_DAYS, 395),
			/** Days and hours are counted in this time zone. */
			timeZone: timeZone(env.ANALYTICS_TIMEZONE)
		},
		rateLimit: {
			/** Captcha challenges per minute per IP */
			captchaPerMinute: positiveNumber(env.RATE_LIMIT_CAPTCHA_PER_MINUTE, 60),
			/** Page view signals per minute per IP on /api/analytics */
			analyticsPerMinute: positiveNumber(env.RATE_LIMIT_ANALYTICS_PER_MINUTE, 120),
			/** Form submissions per minute per IP on /api/mail */
			mailPerMinute: positiveNumber(env.RATE_LIMIT_MAIL_PER_MINUTE, 5),
			/** Requests per minute per signed-in user or API token on /api/v1 */
			perMinute: positiveNumber(env.RATE_LIMIT_PER_MINUTE, 300),
			/** Requests per minute per IP without sign-in */
			anonPerMinute: positiveNumber(env.RATE_LIMIT_ANON_PER_MINUTE, 30)
		}
	};
	if (isProd && config.authSecret.length < 32) {
		throw new Error('AUTH_SECRET fehlt oder ist zu kurz (mind. 32 Zeichen).');
	}
	return config;
}

export type ServerConfig = ReturnType<typeof buildServerConfig>;
