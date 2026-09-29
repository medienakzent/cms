import type { MailEnvelope, MailTransport } from '../transport';
import { parseAddress } from '../transport';

/**
 * Microsoft Graph `sendMail` with an app registration (client credentials).
 * Requires the application permission `Mail.Send` (admin consent) and a
 * mailbox `sender` (UPN) to send on behalf of.
 */
export function createMicrosoftTransport(options: {
	tenantId: string;
	clientId: string;
	clientSecret: string;
	sender: string;
}): MailTransport {
	let token: { value: string; expiresAt: number } | null = null;

	async function getToken(): Promise<string> {
		if (token && token.expiresAt > Date.now() + 60_000) return token.value;
		const response = await fetch(
			`https://login.microsoftonline.com/${encodeURIComponent(options.tenantId)}/oauth2/v2.0/token`,
			{
				method: 'POST',
				headers: { 'content-type': 'application/x-www-form-urlencoded' },
				body: new URLSearchParams({
					client_id: options.clientId,
					client_secret: options.clientSecret,
					scope: 'https://graph.microsoft.com/.default',
					grant_type: 'client_credentials'
				})
			}
		);
		if (!response.ok)
			throw new Error(`Microsoft Token: HTTP ${response.status} ${await response.text()}`);
		const json = (await response.json()) as { access_token: string; expires_in: number };
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
			const response = await fetch(
				`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(options.sender)}/sendMail`,
				{
					method: 'POST',
					headers: {
						authorization: `Bearer ${await getToken()}`,
						'content-type': 'application/json'
					},
					body: JSON.stringify({ message, saveToSentItems: true })
				}
			);
			if (!response.ok)
				throw new Error(`Microsoft sendMail: HTTP ${response.status} ${await response.text()}`);
			// Graph returns no message id (202 Accepted)
			return { messageId: `graph-${Date.now()}` };
		}
	};
}
