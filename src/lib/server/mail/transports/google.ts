import { createSign } from 'node:crypto';
import { readFileSync } from 'node:fs';
import MailComposer from 'nodemailer/lib/mail-composer';
import type { MailEnvelope, MailTransport } from '../transport';

/**
 * Gmail API mit Service-Account und domänenweiter Delegation: der Service-Account
 * sendet im Namen von `sender` (Google-Workspace-Postfach). Scope `gmail.send`.
 */
export function createGoogleTransport(opts: {
	serviceAccountFile: string;
	sender: string;
}): MailTransport {
	const sa = JSON.parse(readFileSync(opts.serviceAccountFile, 'utf8')) as {
		client_email: string;
		private_key: string;
	};
	let token: { value: string; expiresAt: number } | null = null;

	const b64url = (input: Buffer | string) =>
		Buffer.from(input)
			.toString('base64')
			.replace(/\+/g, '-')
			.replace(/\//g, '_')
			.replace(/=+$/, '');

	async function getToken(): Promise<string> {
		if (token && token.expiresAt > Date.now() + 60_000) return token.value;
		const now = Math.floor(Date.now() / 1000);
		const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
		const claims = b64url(
			JSON.stringify({
				iss: sa.client_email,
				sub: opts.sender,
				scope: 'https://www.googleapis.com/auth/gmail.send',
				aud: 'https://oauth2.googleapis.com/token',
				iat: now,
				exp: now + 3600
			})
		);
		const signature = b64url(
			createSign('RSA-SHA256').update(`${header}.${claims}`).sign(sa.private_key)
		);
		const res = await fetch('https://oauth2.googleapis.com/token', {
			method: 'POST',
			headers: { 'content-type': 'application/x-www-form-urlencoded' },
			body: new URLSearchParams({
				grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
				assertion: `${header}.${claims}.${signature}`
			})
		});
		if (!res.ok) throw new Error(`Google Token: HTTP ${res.status} ${await res.text()}`);
		const json = (await res.json()) as { access_token: string; expires_in: number };
		token = { value: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
		return token.value;
	}

	return {
		kind: 'google',
		async send(mail: MailEnvelope) {
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
			const res = await fetch(
				`https://gmail.googleapis.com/gmail/v1/users/${encodeURIComponent(opts.sender)}/messages/send`,
				{
					method: 'POST',
					headers: {
						authorization: `Bearer ${await getToken()}`,
						'content-type': 'application/json'
					},
					body: JSON.stringify({ raw: b64url(raw) })
				}
			);
			if (!res.ok) throw new Error(`Gmail send: HTTP ${res.status} ${await res.text()}`);
			const json = (await res.json()) as { id: string };
			return { messageId: json.id };
		}
	};
}
