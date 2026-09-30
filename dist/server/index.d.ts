/**
 * Server API of the CMS: `import { cms } from './'`.
 *
 *   const page = await cms.collection('pages').get('about', { lang: 'de' });
 *   await cms.collection('pages').save('about', 'de', input, { actor });
 *   await cms.media.upload(file, actor);
 *   await cms.mail.send('contact', data, { lang: 'de' });
 *   await cms.reindex();
 */
import { collection } from './content';
import { reindexMedia } from './media';
import { captchaClientConfig } from './captcha';
export { CmsError } from './errors';
export type { Actor, CollectionApi, GetOptions } from './content';
export { ensureReady } from './init';
export { getAuth, getSessionUser, authOptions, toSessionUser } from './auth';
export type { SessionUser, Role } from './auth';
export { getStorage, paths } from './storage';
export type { ByteRange, StorageAdapter } from './storage';
export { initRuntime, getRuntime, serverConfig, siteConfig } from './runtime';
export type { Runtime } from './runtime';
export type { ServerConfig, Env } from './env';
export { createRateLimiter } from './rate-limit';
export type { MailSubmission, MailMeta } from './mail';
export type { MailTransport, MailEnvelope } from './mail/transport';
export { api, actorOf, requireAdmin, readJsonBody, parseDocumentBody } from './api';
export { adminCollections, adminBlocks, toAdminCollection, toAdminBlock } from './admin';
export { createHandle } from './hooks';
export { captchaClientConfig, verifyCaptcha } from './captcha';
export { sendSystemMail } from './mail';
export { apiKeys } from './api-keys';
export type { ApiKeyInfo } from './api-keys';
export type { AnalyticsReport, Breakdown, Granularity, LiveSnapshot, PageRow, TimelineBucket } from './analytics';
export type { HandleOptions } from './hooks';
export declare const cms: {
    readonly collections: Record<string, import("..").CollectionDefinition<import("..").FieldMap>>;
    readonly blocks: Record<string, import("..").BlockDefinition<import("..").FieldMap>>;
    readonly config: import("..").CmsConfig;
    collection: typeof collection;
    media: {
        upload: typeof import("./media").uploadMedia;
        updateAlt: typeof import("./media").updateMediaAlt;
        remove: typeof import("./media").deleteMedia;
        reindex: typeof reindexMedia;
        get(id: string): Promise<import("..").MediaItem | null>;
        list(options?: {
            kind?: string;
            q?: string;
            limit?: number;
            offset?: number;
        }): Promise<{
            items: import("..").MediaItem[];
            total: number;
        }>;
    };
    mail: {
        send: typeof import("./mail").sendMail;
        sendSystem: typeof import("./mail").sendSystemMail;
        pruneUploads: typeof import("./mail/uploads").pruneUploads;
        readonly templates: Record<string, import("..").MailTemplateDefinition<import("..").FieldMap>>;
        submissions: typeof import("./mail").listSubmissions;
        submission: typeof import("./mail").getSubmission;
        deleteSubmission: typeof import("./mail").deleteSubmission;
        transport: typeof import("./mail").getMailTransport;
    };
    /** Cookieless visitor statistics: `cms.analytics.report({ days: 30, path: '/about' })`. */
    analytics: {
        report: (options: {
            days: number;
            path?: string | null;
        }) => Promise<import("./analytics").AnalyticsReport>;
        activeNow: () => number;
        live: () => import("./analytics").LiveSnapshot;
        subscribe: (listener: (snapshot: import("./analytics").LiveSnapshot) => void) => () => void;
    };
    /** Client configuration for forms (captcha); pass it to the page in the layout load. */
    forms: {
        captcha: typeof captchaClientConfig;
    };
    systemActor: import("./content").Actor;
    reindex(): Promise<{
        media: number;
        documents: number;
        languages: number;
    }>;
};
