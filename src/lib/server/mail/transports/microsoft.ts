import type { MailEnvelope, MailTransport } from '../transport';
import { parseAddress } from '../transport';

/**
 * Microsoft Graph `sendMail` mit App-Registrierung (Client Credentials).
 * Benötigt die Anwendungsberechtigung `Mail.Send` (Admin-Consent) und ein
 * Postfach `sender` (UPN), in dessen Namen gesendet wird.
 */
export function createMicrosoftTransport(opts: {
	tenantId: string;
	clientId: string;
	clientSecret: string;
	sender: string;
}): MailTransport {
	let token: { value: string; expiresAt: number } | null = null;

	async function getToken(): Promise<string> {
		if (token && token.expiresAt > Date.now() + 60_000) return token.value;
		const res = await fetch(
			`https://login.microsoftonline.com/${encodeURIComponent(opts.tenantId)}/oauth2/v2.0/token`,
			{
				method: 'POST',
				headers: { 'content-type': 'application/x-www-form-urlencoded' },
				body: new URLSearchParams({
					client_id: opts.clientId,
					client_secret: opts.clientSecret,
					scope: 'https://graph.microsoft.com/.default',
					grant_type: 'client_credentials'
				})
			}
		);
		if (!res.ok) throw new Error(`Microsoft Token: HTTP ${res.status} ${await res.text()}`);
		const json = (await res.json()) as { access_token: string; expires_in: number };
		token = { value: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
		return token.value;
	}

	return {
		kind: 'microsoft',
		async send(mail: MailEnvelope) {
			const from = parseAddress(mail.from);
			const message = {
				subject: mail.subject,
				body: { contentType: 'HTML', content: mail.html },
				from: { emailAddress: { address: from.address, name: from.name || undefined } },
				toRecipients: mail.to.map((address) => ({ emailAddress: { address } })),
				replyTo: mail.replyTo ? [{ emailAddress: { address: mail.replyTo } }] : undefined
			};
			const res = await fetch(
				`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(opts.sender)}/sendMail`,
				{
					method: 'POST',
					headers: {
						authorization: `Bearer ${await getToken()}`,
						'content-type': 'application/json'
					},
					body: JSON.stringify({ message, saveToSentItems: true })
				}
			);
			if (!res.ok) throw new Error(`Microsoft sendMail: HTTP ${res.status} ${await res.text()}`);
			// Graph liefert keine Message-ID zurück (202 Accepted).
			return { messageId: `graph-${Date.now()}` };
		}
	};
}
