import nodemailer from 'nodemailer';
import type { MailEnvelope, MailTransport } from '../transport';

/** SMTP über nodemailer. `SMTP_URL`, z. B. smtp://user:pass@mail.example.com:587 oder smtps://…:465 */
export function createSmtpTransport(url: string): MailTransport {
	const transporter = nodemailer.createTransport(url);
	return {
		kind: 'smtp',
		async send(mail: MailEnvelope) {
			const info = await transporter.sendMail({
				from: mail.from,
				to: mail.to,
				replyTo: mail.replyTo,
				subject: mail.subject,
				text: mail.text,
				html: mail.html
			});
			return { messageId: info.messageId };
		}
	};
}
