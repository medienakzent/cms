export interface MailEnvelope {
	from: string;
	to: string[];
	replyTo?: string;
	subject: string;
	text: string;
	html: string;
}

/**
 * Versandweg. Implementierungen: smtp (nodemailer), microsoft (Graph API),
 * google (Gmail API mit Service-Account), file (Entwicklung: Ablage im Storage).
 */
export interface MailTransport {
	readonly kind: string;
	send(mail: MailEnvelope): Promise<{ messageId: string }>;
}

export function parseAddress(value: string): { name: string; address: string } {
	const m = /^\s*(?:"?([^"<]*)"?\s*)?<([^>]+)>\s*$/.exec(value);
	if (m) return { name: (m[1] ?? '').trim(), address: m[2].trim() };
	return { name: '', address: value.trim() };
}

export function isEmail(value: string): boolean {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
