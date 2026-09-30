import type { MailTransport } from '../transport';
/**
 * Microsoft Graph `sendMail` with an app registration (client credentials).
 * Requires the application permission `Mail.Send` (admin consent) and a
 * mailbox `sender` (UPN) to send on behalf of.
 */
export declare function createMicrosoftTransport(options: {
    tenantId: string;
    clientId: string;
    clientSecret: string;
    sender: string;
}): MailTransport;
