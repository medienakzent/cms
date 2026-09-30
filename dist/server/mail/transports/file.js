import { nanoid } from 'nanoid';
/** Development/test: mails are not sent but stored under `mail/outbox/`. */
export function createFileTransport(storage) {
    return {
        kind: 'file',
        async send(mail) {
            const id = `${new Date().toISOString().replace(/[:.]/g, '-')}__${nanoid(6)}`;
            await storage.write(`mail/outbox/${id}.json`, JSON.stringify({ id, ...mail }, null, 2));
            console.log(`[cms] Mail (file-Transport) → ${mail.to.join(', ')}: ${mail.subject}`);
            return { messageId: id };
        }
    };
}
