/**
 * Server API of the CMS: `import { cms } from '@medienakzent/cms/server'`.
 *
 *   const page = await cms.collection('pages').get('about', { lang: 'de' });
 *   await cms.collection('pages').save('about', 'de', input, { actor });
 *   await cms.media.upload(file, actor);
 *   await cms.mail.send('contact', data, { lang: 'de' });
 *   await cms.reindex();
 */
import { collection, reindexContent, SYSTEM_ACTOR } from './content';
import { media, reindexMedia } from './media';
import { mail } from './mail';
import { getRuntime } from './runtime';
import { captchaClientConfig } from './captcha';
import { analytics } from './analytics';

export { CmsError } from './errors';
export type { Actor, CollectionApi, GetOptions } from './content';
export { ensureReady } from './init';
export { getAuth, getSessionUser, authOptions, toSessionUser } from './auth';
export type { SessionUser, Role } from './auth';
export { getStorage, paths } from './storage';
export type { StorageAdapter } from './storage';
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
export type { AnalyticsReport, Breakdown, PageRow } from './analytics';
export type { HandleOptions } from './hooks';

export const cms = {
	get collections() {
		return getRuntime().registry.collections;
	},
	get blocks() {
		return getRuntime().registry.blocks;
	},
	get config() {
		return getRuntime().config;
	},
	collection,
	media,
	mail,
	/** Cookieless visitor statistics: `cms.analytics.report({ days: 30, path: '/about' })`. */
	analytics: { report: analytics.report, activeNow: analytics.activeNow },
	/** Client configuration for forms (captcha); pass it to the page in the layout load. */
	forms: { captcha: captchaClientConfig },
	systemActor: SYSTEM_ACTOR,
	async reindex() {
		const content = await reindexContent();
		const mediaCount = await reindexMedia();
		return { ...content, media: mediaCount };
	}
};
