import { nanoid } from 'nanoid';
import type { StorageAdapter } from '../../storage/types';
import type { MailEnvelope, MailTransport } from '../transport';

/** Entwicklung/Test: Mails werden nicht versendet, sondern unter `mail/outbox/` abgelegt. */
export function createFileTransport(storage: StorageAdapter): MailTransport {
	return {
		kind: 'file',
		async send(mail: MailEnvelope) {
			const id = `${new Date().toISOString().replace(/[:.]/g, '-')}__${nanoid(6)}`;
			await storage.write(`mail/outbox/${id}.json`, JSON.stringify({ id, ...mail }, null, 2));
			console.log(`[cms] Mail (file-Transport) → ${mail.to.join(', ')}: ${mail.subject}`);
			return { messageId: id };
		}
	};
}
