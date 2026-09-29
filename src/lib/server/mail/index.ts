import { nanoid } from 'nanoid';
import { localizedText } from '../../mail';
import type { MailTemplateDefinition } from '../../mail';
import type { ValidationIssue } from '../../types';
import { normalizeFields, validateFields } from '../../validate';
import { getRuntime, serverConfig } from '../runtime';
import { CmsError, notFound, validation } from '../errors';
import { getStorage } from '../storage';
import { renderTemplate, toHtml, toText } from './render';
import { checkFile, pruneUploads, storeFiles, type CheckedFile } from './uploads';
import { formatBytes } from '../../format';
import { stripCaptchaFields, verifyCaptcha } from '../captcha';
import type { MailEnvelope, MailTransport } from './transport';
import { isEmail } from './transport';

export interface MailMeta {
	ip?: string;
	userAgent?: string;
	url?: string;
	/** Base URL for download links (default: ORIGIN). */
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
	/** Folder of the uploaded files (mail/uploads/<token>), if any. */
	uploadToken: string | null;
}

let transport: MailTransport | null = null;

/** Transport from `MAIL_TRANSPORT`: file (default), smtp, microsoft, google. */
export async function getMailTransport(): Promise<MailTransport> {
	if (transport) return transport;
	const mailConfig = serverConfig().mail;
	switch (mailConfig.transport) {
		case 'smtp': {
			if (!mailConfig.smtpUrl) throw new Error('MAIL_TRANSPORT=smtp braucht SMTP_URL');
			const { createSmtpTransport } = await import('./transports/smtp');
			transport = createSmtpTransport(mailConfig.smtpUrl);
			break;
		}
		case 'microsoft': {
			const { tenantId, clientId, clientSecret, sender } = mailConfig.microsoft;
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
			const { serviceAccountFile, sender } = mailConfig.google;
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
	const match = /<([^>]+)>/.exec(from);
	return match ? match[1] : from;
}

function resolveRecipients(
	definition: MailTemplateDefinition,
	data: Record<string, unknown>
): string[] {
	const to =
		typeof definition.to === 'function' ? definition.to(data as never) : (definition.to ?? []);
	const recipients = (to.length ? to : serverConfig().mail.defaultTo)
		.map((address) => address.trim())
		.filter(isEmail);
	if (!recipients.length)
		throw new CmsError(
			500,
			`Mail-Vorlage „${definition.name}": kein Empfänger (to oder MAIL_TO_DEFAULT)`
		);
	return recipients;
}

async function record(submission: MailSubmission) {
	await getStorage().write(
		`mail/submissions/${submission.template}/${submission.sentAt.replace(/[:.]/g, '-')}__${submission.id}.json`,
		JSON.stringify(submission, null, 2)
	);
}

/**
 * Validates the data against the template, renders subject/body and sends.
 * Throws CmsError 404 (template), 422 (validation) or 502 (delivery).
 */
export async function sendMail(
	templateName: string,
	input: Record<string, unknown>,
	options: { lang?: string; meta?: MailMeta; files?: Record<string, File> } = {}
): Promise<{ id: string; status: MailSubmission['status'] }> {
	const { registry, config } = getRuntime();
	const definition = registry.mail[templateName];
	if (!definition) throw notFound(`Mail-Vorlage „${templateName}"`);
	const lang =
		options.lang && config.languages.some((language) => language.code === options.lang)
			? options.lang
			: config.defaultLanguage;
	const id = nanoid(10);
	const sentAt = new Date().toISOString();

	// Filled honeypot: record silently, do not send, report "ok" to the client
	const honeypotValue = input[definition.honeypot];
	if (typeof honeypotValue === 'string' && honeypotValue.trim() !== '') {
		await record({
			id,
			template: definition.name,
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
			meta: options.meta ?? {},
			uploadToken: null
		});
		return { id, status: 'spam' };
	}

	// Captcha first: nothing else is touched without a valid answer
	const issues: ValidationIssue[] = [];
	if (definition.captcha) {
		const captchaError = await verifyCaptcha(input);
		if (captchaError) issues.push({ path: '_captcha', message: captchaError });
	}
	input = stripCaptchaFields(input);

	const checkedFiles: CheckedFile[] = [];
	let totalBytes = 0;
	for (const [key, field] of Object.entries(definition.fields)) {
		if (field.kind !== 'file') continue;
		const file = options.files?.[key];
		if (!(file instanceof File) || file.size <= 0) {
			if (field.required) issues.push({ path: key, message: 'Bitte eine Datei auswählen' });
			continue;
		}
		const checkedFile = await checkFile(key, field, file, issues);
		if (checkedFile) {
			checkedFiles.push(checkedFile);
			totalBytes += checkedFile.bytes.length;
		}
	}
	if (totalBytes > definition.maxTotalSize)
		issues.push({
			path: '_files',
			message: `Alle Dateien zusammen höchstens ${formatBytes(definition.maxTotalSize)}`
		});

	// Validate text fields before storing files so all problems arrive in one response
	const textFields = Object.fromEntries(
		Object.entries(definition.fields).filter(([, field]) => field.kind !== 'file')
	);
	const preview = normalizeFields(definition.fields, input);
	validateFields(textFields, preview, { strict: true, blocks: {} }, issues);
	if (definition.replyToField) {
		const replyToValue = preview[definition.replyToField];
		if (typeof replyToValue !== 'string' || !isEmail(replyToValue))
			issues.push({ path: definition.replyToField, message: 'Gültige E-Mail-Adresse erwartet' });
	}
	if (issues.length) throw validation(issues);
	const origin = (options.meta?.origin || serverConfig().origin).replace(/\/+$/, '');
	const stored = checkedFiles.length ? await storeFiles(checkedFiles, origin) : null;

	const data = normalizeFields(definition.fields, { ...input, ...(stored?.refs ?? {}) });
	validateFields(definition.fields, data, { strict: true, blocks: {} }, issues);
	if (issues.length) throw validation(issues);

	const extra = {
		lang,
		ip: options.meta?.ip ?? '',
		url: options.meta?.url ?? '',
		date: new Date().toLocaleString('de-DE')
	};
	const renderLocalized = (text: Parameters<typeof localizedText>[0]) =>
		renderTemplate(
			localizedText(text, lang, config.defaultLanguage),
			definition.fields,
			data,
			extra
		);
	const replyTo = definition.replyToField ? String(data[definition.replyToField]) : null;
	const subject = toText(renderLocalized(definition.subject)).replace(/\s+/g, ' ').trim();
	const bodyMarkdown = renderLocalized(definition.body);
	const to = resolveRecipients(definition, data);

	const envelope: MailEnvelope = {
		from: serverConfig().mail.from,
		to,
		replyTo: replyTo ?? undefined,
		subject,
		text: toText(bodyMarkdown),
		html: toHtml(bodyMarkdown)
	};
	const mailTransport = await getMailTransport();
	const submission: MailSubmission = {
		id,
		template: definition.name,
		lang,
		sentAt,
		status: 'sent',
		transport: mailTransport.kind,
		to,
		replyTo,
		subject,
		messageId: null,
		error: null,
		data,
		meta: options.meta ?? {},
		uploadToken: stored?.token ?? null
	};
	try {
		submission.messageId = (await mailTransport.send(envelope)).messageId;
		if (definition.autoReply) {
			const target = String(data[definition.autoReply.toField] ?? '');
			if (isEmail(target)) {
				const autoReplyMarkdown = renderLocalized(definition.autoReply.body);
				await mailTransport.send({
					from: serverConfig().mail.from,
					to: [target],
					subject: toText(renderLocalized(definition.autoReply.subject)).trim(),
					text: toText(autoReplyMarkdown),
					html: toHtml(autoReplyMarkdown)
				});
			}
		}
	} catch (error) {
		submission.status = 'failed';
		submission.error = (error as Error).message;
		console.error('[cms] Mailversand fehlgeschlagen', error);
	}
	await record(submission);
	if (stored)
		pruneUploads().catch((error) => console.warn('[cms] Upload-Aufräumen fehlgeschlagen', error));
	if (submission.status === 'failed') throw new CmsError(502, 'Mail konnte nicht versendet werden');
	return { id, status: 'sent' };
}

const SUBMISSION_FILE = /\/(\d{4}-\d{2}-\d{2}T[0-9-]+Z)__([A-Za-z0-9_-]+)\.json$/;

async function readSubmission(file: string): Promise<MailSubmission | null> {
	const raw = await getStorage().read(file);
	if (!raw) return null;
	try {
		const parsed = JSON.parse(raw) as Partial<MailSubmission> & Omit<MailSubmission, 'uploadToken'>;
		return { ...parsed, uploadToken: parsed.uploadToken ?? null };
	} catch {
		return null; // skip broken file
	}
}

export interface SubmissionQuery {
	template?: string;
	status?: MailSubmission['status'] | 'all';
	limit?: number;
	offset?: number;
}

/**
 * Form submissions (newest first) from the storage. Only for signed-in
 * users/API tokens; never expose through public routes.
 */
export async function listSubmissions(
	options: SubmissionQuery = {}
): Promise<{ items: MailSubmission[]; total: number }> {
	const storage = getStorage();
	let files = (
		await storage.list(
			options.template ? `mail/submissions/${options.template}` : 'mail/submissions'
		)
	).filter((file) => SUBMISSION_FILE.test(file));
	// File names start with the timestamp, so sorting needs no file reads
	files = files.sort((left, right) =>
		left.split('/').at(-1)! < right.split('/').at(-1)! ? 1 : -1
	);
	const status = options.status ?? 'all';
	const items: MailSubmission[] = [];
	const limit = Math.min(Math.max(options.limit ?? 50, 1), 500);
	const offset = Math.max(options.offset ?? 0, 0);
	if (status === 'all') {
		for (const file of files.slice(offset, offset + limit)) {
			const submission = await readSubmission(file);
			if (submission) items.push(submission);
		}
		return { items, total: files.length };
	}
	let total = 0;
	for (const file of files) {
		const submission = await readSubmission(file);
		if (!submission || submission.status !== status) continue;
		if (total >= offset && items.length < limit) items.push(submission);
		total++;
	}
	return { items, total };
}

async function findSubmissionFile(id: string): Promise<string | null> {
	if (!/^[A-Za-z0-9_-]{6,32}$/.test(id)) return null;
	const files = await getStorage().list('mail/submissions');
	return files.find((file) => file.endsWith(`__${id}.json`)) ?? null;
}

export async function getSubmission(id: string): Promise<MailSubmission | null> {
	const file = await findSubmissionFile(id);
	return file ? readSubmission(file) : null;
}

/** Removes a submission together with its uploaded files. */
export async function deleteSubmission(id: string): Promise<void> {
	const file = await findSubmissionFile(id);
	if (!file) throw notFound('Einsendung');
	const submission = await readSubmission(file);
	const storage = getStorage();
	if (submission?.uploadToken) {
		const directory = `mail/uploads/${submission.uploadToken}`;
		if (storage.removeDir) await storage.removeDir(directory);
		else for (const uploadFile of await storage.list(directory)) await storage.remove(uploadFile);
	}
	await storage.remove(file);
}

/** System message (e.g. password reset) via the configured transport. */
export async function sendSystemMail(message: {
	to: string;
	subject: string;
	markdown: string;
}): Promise<void> {
	const mailTransport = await getMailTransport();
	await mailTransport.send({
		from: serverConfig().mail.from,
		to: [message.to],
		subject: message.subject,
		text: toText(message.markdown),
		html: toHtml(message.markdown)
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
