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
	send(mail: MailEnvelope): Promise<{ messageId: string }>;
}

export function parseAddress(value: string): { name: string; address: string } {
	const match = /^\s*(?:"?([^"<]*)"?\s*)?<([^>]+)>\s*$/.exec(value);
	if (match) return { name: (match[1] ?? '').trim(), address: match[2].trim() };
	return { name: '', address: value.trim() };
}

export function isEmail(value: string): boolean {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
