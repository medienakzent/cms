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
import { stripCaptchaFields, verifyCaptcha } from '../captcha';
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
	/** Ordner der hochgeladenen Dateien (mail/uploads/<token>), falls vorhanden. */
	uploadToken: string | null;
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
			if (!tenantId || !clientId || !clientSecret)
				throw new Error(
					'MAIL_TRANSPORT=microsoft braucht MS_MAIL_TENANT_ID, MS_MAIL_CLIENT_ID, MS_MAIL_CLIENT_SECRET'
				);
			const { createMicrosoftTransport } = await import('./transports/microsoft');
			transport = createMicrosoftTransport({
				tenantId,
				clientId,
				clientSecret,
				sender: sender || fromAddress()
			});
			break;
		}
		case 'google': {
			const { serviceAccountFile, sender } = m.google;
			if (!serviceAccountFile)
				throw new Error('MAIL_TRANSPORT=google braucht GOOGLE_MAIL_SERVICE_ACCOUNT');
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
	const list = (to.length ? to : serverConfig().mail.defaultTo)
		.map((s) => s.trim())
		.filter(isEmail);
	if (!list.length)
		throw new CmsError(500, `Mail-Vorlage „${def.name}": kein Empfänger (to oder MAIL_TO_DEFAULT)`);
	return list;
}

async function record(sub: MailSubmission) {
	await getStorage().write(
		`mail/submissions/${sub.template}/${sub.sentAt.replace(/[:.]/g, '-')}__${sub.id}.json`,
		JSON.stringify(sub, null, 2)
	);
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
	const lang =
		opts.lang && config.languages.some((l) => l.code === opts.lang)
			? opts.lang
			: config.defaultLanguage;
	const id = nanoid(10);
	const sentAt = new Date().toISOString();

	// Honeypot ausgefüllt → still ablegen, nicht senden, nach außen "ok".
	const honey = input[def.honeypot];
	if (typeof honey === 'string' && honey.trim() !== '') {
		await record({
			id,
			template: def.name,
			lang,
			sentAt,
			status: 'spam',
			transport: '-',
			to: [],
			replyTo: null,
			subject: '',
			messageId: null,
			error: 'honeypot',
			data: {},
			meta: opts.meta ?? {},
			uploadToken: null
		});
		return { id, status: 'spam' };
	}

	// Captcha zuerst: ohne gültige Antwort wird nichts weiter angefasst.
	const issues: ValidationIssue[] = [];
	if (def.captcha) {
		const captchaError = await verifyCaptcha(input);
		if (captchaError) issues.push({ path: '_captcha', message: captchaError });
	}
	input = stripCaptchaFields(input);

	// Datei-Felder: prüfen, Gesamtgröße, ablegen — Referenzen wandern in die Daten.
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
	if (total > def.maxTotalSize)
		issues.push({
			path: '_files',
			message: `Alle Dateien zusammen höchstens ${formatBytes(def.maxTotalSize)}`
		});

	// Textfelder prüfen, bevor Dateien abgelegt werden — alle Probleme in einer Antwort.
	const preview = normalizeFields(def.fields, input);
	validateFields(def.fields, preview, { strict: true, blocks: {} }, issues);
	if (def.replyToField) {
		const v = preview[def.replyToField];
		if (typeof v !== 'string' || !isEmail(v))
			issues.push({ path: def.replyToField, message: 'Gültige E-Mail-Adresse erwartet' });
	}
	const fileKeys = new Set(
		Object.entries(def.fields)
			.filter(([, f]) => f.kind === 'file')
			.map(([k]) => k)
	);
	const merged = issues.filter((i) => !fileKeys.has(i.path) || i.message !== 'Pflichtfeld');
	if (merged.length) throw validation(merged);
	const origin = (opts.meta?.origin || serverConfig().origin).replace(/\/+$/, '');
	const stored = checked.length ? await storeFiles(checked, origin) : null;

	const data = normalizeFields(def.fields, { ...input, ...(stored?.refs ?? {}) });
	validateFields(def.fields, data, { strict: true, blocks: {} }, issues);
	if (issues.length) throw validation(issues);

	const extra = {
		lang,
		ip: opts.meta?.ip ?? '',
		url: opts.meta?.url ?? '',
		date: new Date().toLocaleString('de-DE')
	};
	const render = (t: Parameters<typeof localizedText>[0]) =>
		renderTemplate(localizedText(t, lang, config.defaultLanguage), def.fields, data, extra);
	const replyTo = def.replyToField ? String(data[def.replyToField]) : null;
	const subject = toText(render(def.subject)).replace(/\s+/g, ' ').trim();
	const bodyMd = render(def.body);
	const to = resolveRecipients(def, data);

	const envelope: MailEnvelope = {
		from: serverConfig().mail.from,
		to,
		replyTo: replyTo ?? undefined,
		subject,
		text: toText(bodyMd),
		html: toHtml(bodyMd)
	};
	const tp = await getMailTransport();
	const sub: MailSubmission = {
		id,
		template: def.name,
		lang,
		sentAt,
		status: 'sent',
		transport: tp.kind,
		to,
		replyTo,
		subject,
		messageId: null,
		error: null,
		data,
		meta: opts.meta ?? {},
		uploadToken: stored?.token ?? null
	};
	try {
		sub.messageId = (await tp.send(envelope)).messageId;
		if (def.autoReply) {
			const target = String(data[def.autoReply.toField] ?? '');
			if (isEmail(target)) {
				const md = render(def.autoReply.body);
				await tp.send({
					from: serverConfig().mail.from,
					to: [target],
					subject: toText(render(def.autoReply.subject)).trim(),
					text: toText(md),
					html: toHtml(md)
				});
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

const SUB_FILE = /\/(\d{4}-\d{2}-\d{2}T[0-9-]+Z)__([A-Za-z0-9_-]+)\.json$/;

async function readSubmission(file: string): Promise<MailSubmission | null> {
	const raw = await getStorage().read(file);
	if (!raw) return null;
	try {
		const s = JSON.parse(raw) as Partial<MailSubmission> & Omit<MailSubmission, 'uploadToken'>;
		return { ...s, uploadToken: s.uploadToken ?? null };
	} catch {
		return null; // defekte Datei überspringen
	}
}

export interface SubmissionQuery {
	template?: string;
	status?: MailSubmission['status'] | 'all';
	limit?: number;
	offset?: number;
}

/**
 * Formular-Einsendungen (neueste zuerst) aus dem Storage. Nur für angemeldete
 * Nutzer/API-Token — nie über öffentliche Routen ausliefern.
 */
export async function listSubmissions(
	opts: SubmissionQuery = {}
): Promise<{ items: MailSubmission[]; total: number }> {
	const storage = getStorage();
	let files = (
		await storage.list(opts.template ? `mail/submissions/${opts.template}` : 'mail/submissions')
	).filter((f) => SUB_FILE.test(f));
	// Dateiname beginnt mit dem Zeitstempel → Sortierung ohne Lesen der Dateien.
	files = files.sort((a, b) => (a.split('/').at(-1)! < b.split('/').at(-1)! ? 1 : -1));
	const status = opts.status ?? 'all';
	const items: MailSubmission[] = [];
	const limit = Math.min(Math.max(opts.limit ?? 50, 1), 500);
	const offset = Math.max(opts.offset ?? 0, 0);
	let total = 0;
	for (const f of files) {
		const s = await readSubmission(f);
		if (!s || (status !== 'all' && s.status !== status)) continue;
		if (total >= offset && items.length < limit) items.push(s);
		total++;
	}
	return { items, total };
}

async function findSubmissionFile(id: string): Promise<string | null> {
	if (!/^[A-Za-z0-9_-]{6,32}$/.test(id)) return null;
	const files = await getStorage().list('mail/submissions');
	return files.find((f) => f.endsWith(`__${id}.json`)) ?? null;
}

export async function getSubmission(id: string): Promise<MailSubmission | null> {
	const file = await findSubmissionFile(id);
	return file ? readSubmission(file) : null;
}

/** Einsendung samt hochgeladener Dateien entfernen. */
export async function deleteSubmission(id: string): Promise<void> {
	const file = await findSubmissionFile(id);
	if (!file) throw notFound('Einsendung');
	const sub = await readSubmission(file);
	const storage = getStorage();
	if (sub?.uploadToken) {
		const dir = `mail/uploads/${sub.uploadToken}`;
		if (storage.removeDir) await storage.removeDir(dir);
		else for (const f of await storage.list(dir)) await storage.remove(f);
	}
	await storage.remove(file);
}

/** Systemnachricht (z. B. Passwort zurücksetzen) über den konfigurierten Transport. */
export async function sendSystemMail(msg: {
	to: string;
	subject: string;
	markdown: string;
}): Promise<void> {
	const tp = await getMailTransport();
	await tp.send({
		from: serverConfig().mail.from,
		to: [msg.to],
		subject: msg.subject,
		text: toText(msg.markdown),
		html: toHtml(msg.markdown)
	});
}

export const mail = {
	send: sendMail,
	sendSystem: sendSystemMail,
	pruneUploads,
	get templates() {
		return getRuntime().registry.mail;
	},
	submissions: listSubmissions,
	submission: getSubmission,
	deleteSubmission,
	transport: getMailTransport
};
