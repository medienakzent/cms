import type { MailTransport } from '../transport';
/**
 * Gmail API with service account and domain-wide delegation: the service
 * account sends on behalf of `sender` (Google Workspace mailbox). Scope `gmail.send`.
 */
export declare function createGoogleTransport(options: {
    serviceAccountFile: string;
    sender: string;
}): MailTransport;
