export interface MailEnvelope {
    from: string;
    to: string[];
    replyTo?: string;
    subject: string;
    text: string;
    html: string;
}
/**
 * Delivery channel. Implementations: smtp (nodemailer), microsoft (Graph API),
 * google (Gmail API with service account), file (development: stored in the storage).
 */
export interface MailTransport {
    readonly kind: string;
    send(mail: MailEnvelope): Promise<{
        messageId: string;
    }>;
}
export declare function parseAddress(value: string): {
    name: string;
    address: string;
};
export declare function isEmail(value: string): boolean;
