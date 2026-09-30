import type { MailTemplateDefinition } from '../../mail';
import { pruneUploads } from './uploads';
import type { MailTransport } from './transport';
export interface MailMeta {
    ip?: string;
    userAgent?: string;
    url?: string;
    /** Base URL for download links (default: ORIGIN). */
    origin?: string;
}
export interface MailSubmission {
    id: string;
    template: string;
    lang: string;
    sentAt: string;
    status: 'sent' | 'failed' | 'spam';
    transport: string;
    to: string[];
    replyTo: string | null;
    subject: string;
    messageId: string | null;
    error: string | null;
    data: Record<string, unknown>;
    meta: MailMeta;
    /** Folder of the uploaded files (mail/uploads/<token>), if any. */
    uploadToken: string | null;
}
/** Transport from `MAIL_TRANSPORT`: file (default), smtp, microsoft, google. */
export declare function getMailTransport(): Promise<MailTransport>;
/**
 * Validates the data against the template, renders subject/body and sends.
 * Throws CmsError 404 (template), 422 (validation) or 502 (delivery).
 */
export declare function sendMail(templateName: string, input: Record<string, unknown>, options?: {
    lang?: string;
    meta?: MailMeta;
    files?: Record<string, File>;
}): Promise<{
    id: string;
    status: MailSubmission['status'];
}>;
export interface SubmissionQuery {
    template?: string;
    status?: MailSubmission['status'] | 'all';
    limit?: number;
    offset?: number;
}
/**
 * Form submissions (newest first) from the storage. Only for signed-in
 * users/API tokens; never expose through public routes.
 */
export declare function listSubmissions(options?: SubmissionQuery): Promise<{
    items: MailSubmission[];
    total: number;
}>;
export declare function getSubmission(id: string): Promise<MailSubmission | null>;
/** Removes a submission together with its uploaded files. */
export declare function deleteSubmission(id: string): Promise<void>;
/** System message (e.g. password reset) via the configured transport. */
export declare function sendSystemMail(message: {
    to: string;
    subject: string;
    markdown: string;
}): Promise<void>;
export declare const mail: {
    send: typeof sendMail;
    sendSystem: typeof sendSystemMail;
    pruneUploads: typeof pruneUploads;
    readonly templates: Record<string, MailTemplateDefinition<import("../..").FieldMap>>;
    submissions: typeof listSubmissions;
    submission: typeof getSubmission;
    deleteSubmission: typeof deleteSubmission;
    transport: typeof getMailTransport;
};
