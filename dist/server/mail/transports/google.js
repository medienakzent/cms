import { createSign } from 'node:crypto';
import { readFileSync } from 'node:fs';
import MailComposer from 'nodemailer/lib/mail-composer';
/**
 * Gmail API with service account and domain-wide delegation: the service
 * account sends on behalf of `sender` (Google Workspace mailbox). Scope `gmail.send`.
 */
export function createGoogleTransport(options) {
    const serviceAccount = JSON.parse(readFileSync(options.serviceAccountFile, 'utf8'));
    let token = null;
    const base64Url = (input) => Buffer.from(input)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
    async function getToken() {
        if (token && token.expiresAt > Date.now() + 60_000)
            return token.value;
        const nowSeconds = Math.floor(Date.now() / 1000);
        const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
        const claims = base64Url(JSON.stringify({
            iss: serviceAccount.client_email,
            sub: options.sender,
            scope: 'https://www.googleapis.com/auth/gmail.send',
            aud: 'https://oauth2.googleapis.com/token',
            iat: nowSeconds,
            exp: nowSeconds + 3600
        }));
        const signature = base64Url(createSign('RSA-SHA256').update(`${header}.${claims}`).sign(serviceAccount.private_key));
        const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'content-type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                assertion: `${header}.${claims}.${signature}`
            })
        });
        if (!response.ok)
            throw new Error(`Google Token: HTTP ${response.status} ${await response.text()}`);
        const json = (await response.json());
        token = { value: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
        return token.value;
    }
    return {
        kind: 'google',
        async send(mail) {
            const raw = await new MailComposer({
                from: mail.from,
                to: mail.to,
                replyTo: mail.replyTo,
                subject: mail.subject,
                text: mail.text,
                html: mail.html
            })
                .compile()
                .build();
            const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/${encodeURIComponent(options.sender)}/messages/send`, {
                method: 'POST',
                headers: {
                    authorization: `Bearer ${await getToken()}`,
                    'content-type': 'application/json'
                },
                body: JSON.stringify({ raw: base64Url(raw) })
            });
            if (!response.ok)
                throw new Error(`Gmail send: HTTP ${response.status} ${await response.text()}`);
            const json = (await response.json());
            return { messageId: json.id };
        }
    };
}
