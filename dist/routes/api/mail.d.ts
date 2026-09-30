import { type RequestEvent } from '@sveltejs/kit';
/**
 * POST /api/mail/<template>: public (contact and request forms).
 * Fields per template, optional `_lang` and `_redirect` (for forms without JS).
 */
export declare const POST: (event: RequestEvent) => Promise<Response>;
/** GET /api/mail/download/<token>/<name>: only with the token from the mail */
export declare const DOWNLOAD: ({ params }: RequestEvent) => Promise<Response>;
