/**
 * Server configuration from environment variables. Built ONCE at startup
 * (createHandle); the package never reads `$env` itself.
 */
export type Env = Record<string, string | undefined>;
declare const TWO_FACTOR_MODES: readonly ["off", "optional", "required"];
export type TwoFactorMode = (typeof TWO_FACTOR_MODES)[number];
export declare function buildServerConfig(env: Env): {
    isProd: boolean;
    dataDir: string;
    storageDir: string;
    origin: string;
    databaseUrl: string;
    authSecret: string;
    allowSignup: boolean;
    /** Second factor for password logins: off | optional (each user decides) | required. */
    twoFactor: "required" | "optional" | "off";
    trustedOrigins: string[];
    apiToken: string;
    maxUploadBytes: number;
    oauth: {
        github: {
            clientId: string;
            clientSecret: string;
        };
        google: {
            clientId: string;
            clientSecret: string;
        };
        microsoft: {
            clientId: string;
            clientSecret: string;
            tenantId: string;
        };
    };
    mail: {
        /** file (default, stored in the storage) | smtp | microsoft | google */
        transport: "file" | "microsoft" | "google" | "smtp";
        from: string;
        defaultTo: string[];
        smtpUrl: string;
        microsoft: {
            tenantId: string;
            clientId: string;
            clientSecret: string;
            sender: string;
        };
        google: {
            serviceAccountFile: string;
            sender: string;
        };
        /** Retention of uploaded form files in days; 0 = unlimited. */
        uploadRetentionDays: number;
    };
    captcha: {
        /** ALTCHA is always on; CAPTCHA=0 only for tests. */
        enabled: boolean;
        /** HMAC secret for challenges (default: AUTH_SECRET) */
        secret: string;
        /** Proof-of-work cost (PBKDF2 iterations); higher = more protection, slower */
        cost: number;
    };
    analytics: {
        /** Cookieless visitor statistics; ANALYTICS=0 switches collection off. */
        enabled: boolean;
        /** Raw visits are deleted after this many days. */
        retentionDays: number;
        /** Days and hours are counted in this time zone. */
        timeZone: string;
    };
    rateLimit: {
        /** Captcha challenges per minute per IP */
        captchaPerMinute: number;
        /** Page view signals per minute per IP on /api/analytics */
        analyticsPerMinute: number;
        /** Form submissions per minute per IP on /api/mail */
        mailPerMinute: number;
        /** Requests per minute per signed-in user or API token on /api/v1 */
        perMinute: number;
        /** Requests per minute per IP without sign-in */
        anonPerMinute: number;
    };
};
export type ServerConfig = ReturnType<typeof buildServerConfig>;
export {};
