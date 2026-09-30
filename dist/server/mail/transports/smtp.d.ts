import type { MailTransport } from '../transport';
/** SMTP via nodemailer. `SMTP_URL`, e.g. smtp://user:pass@mail.example.com:587 or smtps://…:465 */
export declare function createSmtpTransport(url: string): MailTransport;
