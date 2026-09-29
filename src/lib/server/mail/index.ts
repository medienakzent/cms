import { nanoid } from 'nanoid';
import { localizedText } from '../../mail';
import type { MailTemplateDefinition } from '../../mail';
import type { ValidationIssue } from '../../types';
import { normalizeFields, validateFields } from '../../validate';
import { getRuntime, serverConfig } from '../runtime';
import { CmsError, notFound, validation } from '../errors';
import { getStorage } from '../storage';
import { renderTemplate, toHtml, toText } from './render';
import { checkFile, formatBytes, pruneUploads, storeFiles, type CheckedFile } from './uploads';
import type { MailEnvelope, MailTransport } from './transport';
import { isEmail } from './transport';

export interface MailMeta {
	ip?: string;
	userAgent?: string;
	url?: string;
	/** Basis-URL für Download-Links (Default: ORIGIN). */
	origin?: string;
}

export interface MailSubmission {
	id: string;
	template: string;
	lang: string;
	sentAt: string;
	status: 'sent' | 'failed' | 'spam';
	transport: string;
	to: string[];
	replyTo: string | null;
	subject: string;
	messageId: string | null;
	error: string | null;
	data: Record<string, unknown>;
	meta: MailMeta;
}

let transport: MailTransport | null = null;

/** Transport aus `MAIL_TRANSPORT` — file (Default), smtp, microsoft, google. */
export async function getMailTransport(): Promise<MailTransport> {
	if (transport) return transport;
	const m = serverConfig().mail;
	switch (m.transport) {
		case 'smtp': {
			if (!m.smtpUrl) throw new Error('MAIL_TRANSPORT=smtp braucht SMTP_URL');
			const { createSmtpTransport } = await import('./transports/smtp');
			transport = createSmtpTransport(m.smtpUrl);
			break;
		}
		case 'microsoft': {
			const { tenantId, clientId, clientSecret, sender } = m.microsoft;
			if (!tenantId || !clientId || !clientSecret) throw new Error('MAIL_TRANSPORT=microsoft braucht MS_MAIL_TENANT_ID, MS_MAIL_CLIENT_ID, MS_MAIL_CLIENT_SECRET');
			const { createMicrosoftTransport } = await import('./transports/microsoft');
			transport = createMicrosoftTransport({ tenantId, clientId, clientSecret, sender: sender || fromAddress() });
			break;
		}
		case 'google': {
			const { serviceAccountFile, sender } = m.google;
			if (!serviceAccountFile) throw new Error('MAIL_TRANSPORT=google braucht GOOGLE_MAIL_SERVICE_ACCOUNT');
			const { createGoogleTransport } = await import('./transports/google');
			transport = createGoogleTransport({ serviceAccountFile, sender: sender || fromAddress() });
			break;
		}
		default: {
			const { createFileTransport } = await import('./transports/file');
			transport = createFileTransport(getStorage());
		}
	}
	return transport;
}

function fromAddress(): string {
	const from = serverConfig().mail.from;
	const m = /<([^>]+)>/.exec(from);
	return m ? m[1] : from;
}

function resolveRecipients(def: MailTemplateDefinition, data: Record<string, unknown>): string[] {
	const to = typeof def.to === 'function' ? def.to(data as never) : (def.to ?? []);
	const list = (to.length ? to : serverConfig().mail.defaultTo).map((s) => s.trim()).filter(isEmail);
	if (!list.length) throw new CmsError(500, `Mail-Vorlage „${def.name}": kein Empfänger (to oder MAIL_TO_DEFAULT)`);
	return list;
}

async function record(sub: MailSubmission) {
	await getStorage().write(`mail/submissions/${sub.template}/${sub.sentAt.replace(/[:.]/g, '-')}__${sub.id}.json`, JSON.stringify(sub, null, 2));
}

/**
 * Validiert die Daten gegen die Vorlage, rendert Betreff/Text und versendet.
 * Wirft CmsError 404 (Vorlage), 422 (Validierung) oder 502 (Versand).
 */
export async function sendMail(
	templateName: string,
	input: Record<string, unknown>,
	opts: { lang?: string; meta?: MailMeta; files?: Record<string, File> } = {}
): Promise<{ id: string; status: MailSubmission['status'] }> {
	const { registry, config } = getRuntime();
	const def = registry.mail[templateName];
	if (!def) throw notFound(`Mail-Vorlage „${templateName}"`);
	const lang = opts.lang && config.languages.some((l) => l.code === opts.lang) ? opts.lang : config.defaultLanguage;
	const id = nanoid(10);
	const sentAt = new Date().toISOString();

	// Honeypot ausgefüllt → still ablegen, nicht senden, nach außen "ok".
	const honey = input[def.honeypot];
	if (typeof honey === 'string' && honey.trim() !== '') {
		await record({ id, template: def.name, lang, sentAt, status: 'spam', transport: '-', to: [], replyTo: null, subject: '', messageId: null, error: 'honeypot', data: {}, meta: opts.meta ?? {} });
		return { id, status: 'spam' };
	}

	// Datei-Felder: prüfen, Gesamtgröße, ablegen — Referenzen wandern in die Daten.
	const issues: ValidationIssue[] = [];
	const checked: CheckedFile[] = [];
	let total = 0;
	for (const [key, field] of Object.entries(def.fields)) {
		if (field.kind !== 'file') continue;
		const file = opts.files?.[key];
		if (!(file instanceof File) || file.size <= 0) {
			if (field.required) issues.push({ path: key, message: 'Bitte eine Datei auswählen' });
			continue;
		}
		const ok = await checkFile(key, field, file, issues);
		if (ok) {
			checked.push(ok);
			total += ok.bytes.length;
		}
	}
	if (total > def.maxTotalSize) issues.push({ path: '_files', message: `Alle Dateien zusammen höchstens ${formatBytes(def.maxTotalSize)}` });
	if (issues.length) throw validation(issues);
	const origin = (opts.meta?.origin || serverConfig().origin).replace(/\/+$/, '');
	const stored = checked.length ? await storeFiles(checked, origin) : null;

	const data = normalizeFields(def.fields, { ...input, ...(stored?.refs ?? {}) });
	validateFields(def.fields, data, { strict: true, blocks: {} }, issues);
	if (def.replyToField) {
		const v = data[def.replyToField];
		if (typeof v !== 'string' || !isEmail(v)) issues.push({ path: def.replyToField, message: 'Gültige E-Mail-Adresse erwartet' });
	}
	if (issues.length) throw validation(issues);

	const extra = { lang, ip: opts.meta?.ip ?? '', url: opts.meta?.url ?? '', date: new Date().toLocaleString('de-DE') };
	const render = (t: Parameters<typeof localizedText>[0]) => renderTemplate(localizedText(t, lang, config.defaultLanguage), def.fields, data, extra);
	const replyTo = def.replyToField ? String(data[def.replyToField]) : null;
	const subject = toText(render(def.subject)).replace(/\s+/g, ' ').trim();
	const bodyMd = render(def.body);
	const to = resolveRecipients(def, data);

	const envelope: MailEnvelope = { from: serverConfig().mail.from, to, replyTo: replyTo ?? undefined, subject, text: toText(bodyMd), html: toHtml(bodyMd) };
	const tp = await getMailTransport();
	const sub: MailSubmission = { id, template: def.name, lang, sentAt, status: 'sent', transport: tp.kind, to, replyTo, subject, messageId: null, error: null, data, meta: opts.meta ?? {} };
	try {
		sub.messageId = (await tp.send(envelope)).messageId;
		if (def.autoReply) {
			const target = String(data[def.autoReply.toField] ?? '');
			if (isEmail(target)) {
				const md = render(def.autoReply.body);
				await tp.send({ from: serverConfig().mail.from, to: [target], subject: toText(render(def.autoReply.subject)).trim(), text: toText(md), html: toHtml(md) });
			}
		}
	} catch (e) {
		sub.status = 'failed';
		sub.error = (e as Error).message;
		console.error('[cms] Mailversand fehlgeschlagen', e);
	}
	await record(sub);
	if (stored) pruneUploads().catch((e) => console.warn('[cms] Upload-Aufräumen fehlgeschlagen', e));
	if (sub.status === 'failed') throw new CmsError(502, 'Mail konnte nicht versendet werden');
	return { id, status: 'sent' };
}

/** Eingegangene Formular-Sendungen (neueste zuerst) aus dem Storage. */
export async function listSubmissions(opts: { template?: string; limit?: number } = {}): Promise<MailSubmission[]> {
	const storage = getStorage();
	const files = (await storage.list(opts.template ? `mail/submissions/${opts.template}` : 'mail/submissions')).sort().reverse().slice(0, opts.limit ?? 200);
	const out: MailSubmission[] = [];
	for (const f of files) {
		const raw = await storage.read(f);
		if (!raw) continue;
		try {
			out.push(JSON.parse(raw) as MailSubmission);
		} catch {
			/* defekte Datei überspringen */
		}
	}
	return out;
}

export const mail = {
	send: sendMail,
	pruneUploads,
	get templates() {
		return getRuntime().registry.mail;
	},
	submissions: listSubmissions,
	transport: getMailTransport
};
