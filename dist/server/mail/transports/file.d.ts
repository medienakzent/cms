import type { StorageAdapter } from '../../storage/types';
import type { MailTransport } from '../transport';
/** Development/test: mails are not sent but stored under `mail/outbox/`. */
export declare function createFileTransport(storage: StorageAdapter): MailTransport;
