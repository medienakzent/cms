/**
 * Server runtime: registry + configuration, set by `createHandle` in the
 * customer project. All server modules access it through `getRuntime()`.
 */
import type { CmsConfig } from '../config';
import type { Registry } from '../registry';
import { type Env, type ServerConfig } from './env';
export interface Runtime {
    registry: Registry;
    config: CmsConfig;
    server: ServerConfig;
    languages: string[];
}
export declare function initRuntime(registry: Registry, env: Env): Runtime;
export declare function getRuntime(): Runtime;
export declare const serverConfig: () => {
    isProd: boolean;
    dataDir: string;
    storageDir: string;
    origin: string;
    databaseUrl: string;
    authSecret: string;
    allowSignup: boolean;
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
        uploadRetentionDays: number;
    };
    captcha: {
        enabled: boolean;
        secret: string;
        cost: number;
    };
    analytics: {
        enabled: boolean;
        retentionDays: number;
        timeZone: string;
    };
    rateLimit: {
        captchaPerMinute: number;
        analyticsPerMinute: number;
        mailPerMinute: number;
        perMinute: number;
        anonPerMinute: number;
    };
};
export declare const siteConfig: () => CmsConfig;
