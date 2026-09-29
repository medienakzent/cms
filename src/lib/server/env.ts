/**
 * Server-Konfiguration aus Umgebungsvariablen. Das Objekt wird EINMAL beim
 * Start gebaut (createHandle) — das Paket liest nie selbst `$env`.
 */
export type Env = Record<string, string | undefined>;

function num(value: string | undefined, fallback: number): number {
	const n = Number(value);
	return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function buildServerConfig(env: Env) {
	const isProd = env.NODE_ENV === 'production';
	const cfg = {
		isProd,
		dataDir: env.DATA_DIR || 'data',
		storageDir: env.STORAGE_DIR || 'storage',
		origin: (env.ORIGIN || 'http://localhost:5173').replace(/\/+$/, ''),
		databaseUrl: env.DATABASE_URL || 'sqlite:cms.db',
		authSecret: env.AUTH_SECRET || '',
		allowSignup: env.ALLOW_SIGNUP === '1',
		apiToken: env.API_TOKEN || '',
		maxUploadBytes: num(env.MAX_UPLOAD_MB, 200) * 1024 * 1024,
		oauth: {
			github: { clientId: env.GITHUB_CLIENT_ID || '', clientSecret: env.GITHUB_CLIENT_SECRET || '' },
			google: { clientId: env.GOOGLE_CLIENT_ID || '', clientSecret: env.GOOGLE_CLIENT_SECRET || '' },
			microsoft: {
				clientId: env.MICROSOFT_CLIENT_ID || '',
				clientSecret: env.MICROSOFT_CLIENT_SECRET || '',
				tenantId: env.MICROSOFT_TENANT_ID || 'common'
			}
		},
		mail: {
			/** file (Default, Ablage im Storage) | smtp | microsoft | google */
			transport: (env.MAIL_TRANSPORT || 'file') as 'file' | 'smtp' | 'microsoft' | 'google',
			from: env.MAIL_FROM || 'CMS <noreply@localhost>',
			defaultTo: (env.MAIL_TO_DEFAULT || '').split(',').map((s) => s.trim()).filter(Boolean),
			smtpUrl: env.SMTP_URL || '',
			microsoft: {
				tenantId: env.MS_MAIL_TENANT_ID || '',
				clientId: env.MS_MAIL_CLIENT_ID || '',
				clientSecret: env.MS_MAIL_CLIENT_SECRET || '',
				sender: env.MS_MAIL_SENDER || ''
			},
			google: { serviceAccountFile: env.GOOGLE_MAIL_SERVICE_ACCOUNT || '', sender: env.GOOGLE_MAIL_SENDER || '' },
			/** Aufbewahrung hochgeladener Formulardateien in Tagen; 0 = unbegrenzt. */
			uploadRetentionDays: Number(env.MAIL_UPLOAD_RETENTION_DAYS ?? 180) || 0
		},
		captcha: {
			/** ALTCHA ist immer an; CAPTCHA=0 nur für Tests. */
			enabled: env.CAPTCHA !== '0',
			/** HMAC-Geheimnis für die Aufgaben (Default: AUTH_SECRET) */
			secret: env.CAPTCHA_SECRET || env.AUTH_SECRET || 'dev-captcha-secret',
			/** Rechenaufwand (PBKDF2-Iterationen); höher = mehr Schutz, langsamer */
			cost: num(env.ALTCHA_COST, 1000)
		},
		rateLimit: {
			/** Captcha-Aufgaben pro Minute je IP */
			captchaPerMinute: num(env.RATE_LIMIT_CAPTCHA_PER_MINUTE, 60),
			/** Formular-Sendungen pro Minute je IP auf /api/mail */
			mailPerMinute: num(env.RATE_LIMIT_MAIL_PER_MINUTE, 5),
			/** Anfragen pro Minute je angemeldetem Nutzer bzw. API-Token auf /api/v1 */
			perMinute: num(env.RATE_LIMIT_PER_MINUTE, 300),
			/** Anfragen pro Minute je IP ohne Anmeldung */
			anonPerMinute: num(env.RATE_LIMIT_ANON_PER_MINUTE, 30)
		}
	};
	if (isProd && cfg.authSecret.length < 32) {
		throw new Error('AUTH_SECRET fehlt oder ist zu kurz (mind. 32 Zeichen).');
	}
	return cfg;
}

export type ServerConfig = ReturnType<typeof buildServerConfig>;
