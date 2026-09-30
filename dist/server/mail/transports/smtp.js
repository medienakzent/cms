import nodemailer from 'nodemailer';
/** SMTP via nodemailer. `SMTP_URL`, e.g. smtp://user:pass@mail.example.com:587 or smtps://…:465 */
export function createSmtpTransport(url) {
    const transporter = nodemailer.createTransport(url);
    return {
        kind: 'smtp',
        async send(mail) {
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
