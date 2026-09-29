/**
 * Bibliotheks-API für Inhalte. Admin-UI, REST-Routen und CLI benutzen
 * ausschließlich diese Funktionen — es gibt keinen zweiten Codepfad.
 */
import { nanoid } from 'nanoid';
import type { CollectionDefinition } from '../collection';
export type { ListQueryInput } from '../query';
import type { Field, FieldMap } from '../fields';
import { mergeBlocks, mergeFields, splitBlocks, splitFields } from '../localize';
import { allowedBlocks } from '../registry';
import { getRuntime } from './runtime';
import { isValidSlug } from '../slug';
import type {
	BaseFile,
	Document,
	DocumentInput,
	DocumentStatus,
	LangMeta,
	OverlayFile,
	RenderBlock,
	VersionInfo
} from '../types';
import { normalizeField, normalizeFields, validateBlocks, validateFields } from '../validate';
import { extractFacets } from '../facets';
import { buildListQuery, isListQuery, QueryError, type ListQuery, type ListQueryInput } from '../query';
import { badRequest, CmsError, conflict, notFound, validation } from './errors';
import { getIndex } from './index/index';
import type { IndexDocument } from './index/repo';
import { getStorage, parseContentFile, paths } from './storage';

export interface Actor {
	id: string;
	name: string;
}

export const SYSTEM_ACTOR: Actor = { id: 'system', name: 'system' };

const now = () => new Date().toISOString();
const blockDefs = () => getRuntime().registry.blocks;
const collections = () => getRuntime().registry.collections;
const languages = () => getRuntime().languages;
const defaultLanguage = () => getRuntime().config.defaultLanguage;

function assertLang(lang: string): void {
	if (!languages().includes(lang)) throw badRequest(`Unbekannte Sprache „${lang}"`);
}

// ── Sperren pro Dokument (in-process) ───────────────────────────────────────
const locks = new Map<string, Promise<unknown>>();
async function withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
	const prev = locks.get(key) ?? Promise.resolve();
	const next = prev.catch(() => undefined).then(fn);
	locks.set(key, next);
	try {
		return await next;
	} finally {
		if (locks.get(key) === next) locks.delete(key);
	}
}

// ── Storage-Zugriff ─────────────────────────────────────────────────────────
async function readJson<T>(path: string): Promise<T | null> {
	const raw = await getStorage().read(path);
	if (raw === null) return null;
	try {
		return JSON.parse(raw) as T;
	} catch {
		throw new Error(`Storage: ungültiges JSON in ${path}`);
	}
}

const writeJson = (path: string, data: unknown) =>
	getStorage().write(path, JSON.stringify(data, null, 2) + '\n');

async function readBase(collection: string, slug: string) {
	return readJson<BaseFile>(paths.base(collection, slug));
}

async function readOverlays(collection: string, slug: string) {
	const out: Record<string, OverlayFile> = {};
	for (const lang of languages()) {
		const o = await readJson<OverlayFile>(paths.overlay(collection, slug, lang));
		if (o) out[lang] = o;
	}
	return out;
}

/** Vorherigen Stand einer Datei in die Historie kopieren (Versionierung). */
async function archive(collection: string, slug: string, part: string, actor: Actor) {
	const storage = getStorage();
	const src = part === 'base' ? paths.base(collection, slug) : paths.overlay(collection, slug, part);
	const raw = await storage.read(src);
	if (raw === null) return;
	const savedAt = now();
	const versionId = `${savedAt.replace(/[:.]/g, '-')}__${part}`;
	await storage.write(
		paths.history(collection, slug, versionId),
		JSON.stringify({ savedAt, savedBy: actor.name, part, content: JSON.parse(raw) }, null, 2)
	);
}

// ── Zusammenführen ──────────────────────────────────────────────────────────
function langMeta(o: OverlayFile): LangMeta {
	return {
		lang: o.lang,
		status: o.status,
		updatedAt: o.updatedAt,
		updatedBy: o.updatedBy,
		publishedAt: o.publishedAt
	};
}

function toDocument(
	def: CollectionDefinition,
	base: BaseFile,
	overlays: Record<string, OverlayFile>,
	lang: string,
	fallback: boolean
): Document {
	const overlay = overlays[lang];
	const fb = fallback && lang !== defaultLanguage() ? overlays[defaultLanguage()] : undefined;
	return {
		id: base.id,
		collection: base.collection,
		slug: base.slug,
		lang,
		status: overlay?.status ?? 'draft',
		createdAt: base.createdAt,
		updatedAt: overlay?.updatedAt ?? base.updatedAt,
		updatedBy: overlay?.updatedBy ?? base.updatedBy,
		publishedAt: overlay?.publishedAt ?? null,
		langs: Object.values(overlays).map(langMeta),
		fields: mergeFields(def.fields, base.fields, overlay?.fields, fb?.fields) as Document['fields'],
		blocks: mergeBlocks(blockDefs(), base.blocks, overlay?.blocks, fb?.blocks)
	};
}

// ── Index-Ableitung ─────────────────────────────────────────────────────────
function collectText(fields: FieldMap, value: Record<string, unknown>, out: string[]) {
	for (const [key, field] of Object.entries(fields)) collectFieldText(field, value?.[key], out);
}
function collectFieldText(field: Field, v: unknown, out: string[]) {
	switch (field.kind) {
		case 'text':
		case 'textarea':
		case 'richtext':
			if (typeof v === 'string' && v) out.push(v);
			break;
		case 'list':
			if (Array.isArray(v)) for (const item of v) collectFieldText(field.of, item, out);
			break;
		case 'group':
			collectText(field.fields, (v as Record<string, unknown>) ?? {}, out);
			break;
		case 'blocks':
			collectBlockText((v as RenderBlock[]) ?? [], out);
			break;
	}
}
function collectBlockText(blocks: RenderBlock[], out: string[]) {
	for (const b of blocks) {
		const def = blockDefs()[b.type];
		if (def) collectText(def.fields, b.data, out);
	}
}

function collectRefs(fields: FieldMap, value: Record<string, unknown>, out: Set<string>) {
	for (const [key, field] of Object.entries(fields)) {
		const v = value?.[key];
		if (field.kind === 'reference' && typeof v === 'string') out.add(`${field.collection}:${v}`);
		else if (field.kind === 'references' && Array.isArray(v))
			for (const s of v) out.add(`${field.collection}:${s}`);
		else if (field.kind === 'group') collectRefs(field.fields, (v as Record<string, unknown>) ?? {}, out);
		else if (field.kind === 'list' && Array.isArray(v))
			for (const item of v) collectRefs({ item: field.of }, { item }, out);
		else if (field.kind === 'blocks' && Array.isArray(v))
			for (const b of v as RenderBlock[]) {
				const def = blockDefs()[b.type];
				if (def) collectRefs(def.fields, b.data, out);
			}
	}
}

function indexRows(
	def: CollectionDefinition,
	base: BaseFile,
	overlays: Record<string, OverlayFile>
): IndexDocument[] {
	return Object.keys(overlays).map((lang) => {
		const doc = toDocument(def, base, overlays, lang, false);
		const text: string[] = [];
		collectText(def.fields, doc.fields, text);
		collectBlockText(doc.blocks, text);
		const refs = new Set<string>();
		collectRefs(def.fields, doc.fields, refs);
		for (const b of doc.blocks) {
			const bd = blockDefs()[b.type];
			if (bd) collectRefs(bd.fields, b.data, refs);
		}
		return {
			collection: def.name,
			slug: base.slug,
			lang,
			id: base.id,
			status: doc.status,
			title: String(doc.fields[def.titleField] ?? ''),
			excerpt: def.excerptField ? String(doc.fields[def.excerptField] ?? '').slice(0, 300) : '',
			search: `${base.slug} ${text.join(' ')}`.slice(0, 20000),
			refs: [...refs],
			facets: extractFacets(def.fields, doc.fields),
			createdAt: doc.createdAt,
			updatedAt: doc.updatedAt,
			updatedBy: doc.updatedBy,
			publishedAt: doc.publishedAt
		};
	});
}

async function reindexDocument(def: CollectionDefinition, base: BaseFile, overlays: Record<string, OverlayFile>) {
	const index = await getIndex();
	await index.pruneLangs(def.name, base.slug, Object.keys(overlays));
	const rows = indexRows(def, base, overlays);
	if (rows.length) await index.upsertDocument(rows);
}

// ── Eingaben normalisieren + prüfen ─────────────────────────────────────────
function prepareInput(def: CollectionDefinition, input: DocumentInput, strict: boolean) {
	const fields = normalizeFields(def.fields, input.fields);
	const allowed = allowedBlocks(def);
	const blocks = (
		normalizeField({ kind: 'blocks' }, def.blocks ? input.blocks : []) as RenderBlock[]
	).map((b) => {
		const bd = blockDefs()[b.type];
		return { id: b.id || nanoid(8), type: b.type, data: bd ? normalizeFields(bd.fields, b.data) : b.data };
	});
	const ctx = { strict, blocks: blockDefs() };
	const issues = validateFields(def.fields, fields, ctx);
	validateBlocks(blocks, allowed, ctx, issues);
	if (issues.length) throw validation(issues);
	return { fields, blocks };
}

function getDef(name: string): CollectionDefinition {
	const def = collections()[name];
	if (!def) throw notFound(`Collection „${name}"`);
	return def;
}

// ── Öffentliche API ─────────────────────────────────────────────────────────
export interface GetOptions {
	lang?: string;
	/** Fehlende Übersetzungen feldweise aus der Standardsprache füllen (Default: true). */
	fallback?: boolean;
	/** `published` (Default) liefert nur veröffentlichte Sprachfassungen. */
	status?: DocumentStatus | 'all';
}

export function collection(name: string) {
	const def = getDef(name);

	function toQuery(input: ListQueryInput) {
		try {
			return buildListQuery(def, input, languages());
		} catch (e) {
			if (e instanceof QueryError) throw new CmsError(400, e.message, e.issues);
			throw e;
		}
	}

	async function load(slug: string) {
		const base = await readBase(def.name, slug);
		if (!base) return null;
		return { base, overlays: await readOverlays(def.name, slug) };
	}

	return {
		definition: def,

		/**
		 * Liste aus dem Index. Filter/Sortierung werden strikt gegen die Felddefinition
		 * geprüft (siehe query.ts); Fehler → CmsError 400 mit Problemliste.
		 */
		async list(input: ListQueryInput | ListQuery = {}) {
			const query = isListQuery(input) ? input : toQuery(input);
			if (query.collection !== def.name) throw badRequest('Abfrage gehört zu einer anderen Collection');
			return (await getIndex()).list(query);
		},
		/** Geprüfte Abfrage aus Rohparametern (z. B. URLSearchParams der API). */
		query: toQuery,

		async get(slug: string, opts: GetOptions = {}): Promise<Document | null> {
			const lang = opts.lang ?? defaultLanguage();
			assertLang(lang);
			const loaded = await load(slug);
			if (!loaded) return null;
			const overlay = loaded.overlays[lang];
			if (!overlay) return null;
			const status = opts.status ?? 'published';
			if (status !== 'all' && overlay.status !== status) return null;
			return toDocument(def, loaded.base, loaded.overlays, lang, opts.fallback ?? true);
		},

		/** Für den Editor: ohne Fallback, unabhängig vom Status; fehlende Sprache = leere Übersetzung. */
		async getEditable(slug: string, lang: string) {
			assertLang(lang);
			const loaded = await load(slug);
			if (!loaded) return null;
			return {
				exists: !!loaded.overlays[lang],
				doc: toDocument(def, loaded.base, loaded.overlays, lang, false)
			};
		},

		async exists(slug: string) {
			return getStorage().exists(paths.base(def.name, slug));
		},

		async create(opts: {
			slug: string;
			lang?: string;
			input?: Partial<DocumentInput>;
			status?: DocumentStatus;
			actor: Actor;
		}): Promise<Document> {
			const lang = opts.lang ?? defaultLanguage();
			assertLang(lang);
			if (!isValidSlug(opts.slug)) throw badRequest(`Ungültiger Slug „${opts.slug}"`);
			return withLock(`${def.name}/${opts.slug}`, async () => {
				if (await getStorage().exists(paths.base(def.name, opts.slug))) {
					throw conflict(`„${opts.slug}" existiert bereits in ${def.labelPlural}`);
				}
				const status = opts.status ?? 'draft';
				const { fields, blocks } = prepareInput(
					def,
					{ fields: opts.input?.fields ?? {}, blocks: opts.input?.blocks ?? [] },
					status === 'published'
				);
				const ts = now();
				const sf = splitFields(def.fields, fields);
				const sb = splitBlocks(blockDefs(), blocks);
				const base: BaseFile = {
					id: nanoid(12),
					collection: def.name,
					slug: opts.slug,
					schemaVersion: def.version,
					createdAt: ts,
					createdBy: opts.actor.name,
					updatedAt: ts,
					updatedBy: opts.actor.name,
					fields: sf.base,
					blocks: sb.base
				};
				const overlay: OverlayFile = {
					lang,
					status,
					updatedAt: ts,
					updatedBy: opts.actor.name,
					publishedAt: status === 'published' ? ts : null,
					fields: sf.local,
					blocks: sb.local
				};
				await writeJson(paths.base(def.name, opts.slug), base);
				await writeJson(paths.overlay(def.name, opts.slug, lang), overlay);
				const overlays = { [lang]: overlay };
				await reindexDocument(def, base, overlays);
				return toDocument(def, base, overlays, lang, false);
			});
		},

		/**
		 * Speichert eine Sprachfassung. Nicht-lokalisierte Felder und die
		 * Block-Struktur gelten für alle Sprachen (Basis-Datei).
		 */
		async save(
			slug: string,
			lang: string,
			input: DocumentInput,
			opts: { actor: Actor; status?: DocumentStatus }
		): Promise<Document> {
			assertLang(lang);
			return withLock(`${def.name}/${slug}`, async () => {
				const loaded = await load(slug);
				if (!loaded) throw notFound(`${def.label} „${slug}"`);
				const { base, overlays } = loaded;
				const prev = overlays[lang];
				const status = opts.status ?? prev?.status ?? 'draft';
				const { fields, blocks } = prepareInput(def, input, status === 'published');
				const ts = now();
				const sf = splitFields(def.fields, fields);
				const sb = splitBlocks(blockDefs(), blocks);

				await archive(def.name, slug, 'base', opts.actor);
				await archive(def.name, slug, lang, opts.actor);

				const newBase: BaseFile = {
					...base,
					schemaVersion: def.version,
					updatedAt: ts,
					updatedBy: opts.actor.name,
					fields: sf.base,
					blocks: sb.base
				};
				const newOverlay: OverlayFile = {
					lang,
					status,
					updatedAt: ts,
					updatedBy: opts.actor.name,
					publishedAt:
						status === 'published' ? (prev?.publishedAt ?? ts) : (prev?.publishedAt ?? null),
					fields: sf.local,
					blocks: sb.local
				};
				await writeJson(paths.base(def.name, slug), newBase);
				await writeJson(paths.overlay(def.name, slug, lang), newOverlay);
				overlays[lang] = newOverlay;

				// Overlays anderer Sprachen: Einträge gelöschter Blocks entfernen.
				const liveIds = new Set(blocks.map((b) => b.id));
				for (const [l, o] of Object.entries(overlays)) {
					if (l === lang) continue;
					const orphan = Object.keys(o.blocks ?? {}).filter((id) => !liveIds.has(id));
					if (orphan.length) {
						for (const id of orphan) delete o.blocks[id];
						await writeJson(paths.overlay(def.name, slug, l), o);
					}
				}
				await reindexDocument(def, newBase, overlays);
				return toDocument(def, newBase, overlays, lang, false);
			});
		},

		async setStatus(slug: string, lang: string, status: DocumentStatus, actor: Actor): Promise<Document> {
			assertLang(lang);
			return withLock(`${def.name}/${slug}`, async () => {
				const loaded = await load(slug);
				const overlay = loaded?.overlays[lang];
				if (!loaded || !overlay) throw notFound(`${def.label} „${slug}" (${lang})`);
				if (status === 'published') {
					const doc = toDocument(def, loaded.base, loaded.overlays, lang, false);
					prepareInput(def, { fields: doc.fields, blocks: doc.blocks }, true);
				}
				await archive(def.name, slug, lang, actor);
				overlay.status = status;
				overlay.updatedAt = now();
				overlay.updatedBy = actor.name;
				if (status === 'published') overlay.publishedAt = overlay.publishedAt ?? overlay.updatedAt;
				await writeJson(paths.overlay(def.name, slug, lang), overlay);
				await reindexDocument(def, loaded.base, loaded.overlays);
				return toDocument(def, loaded.base, loaded.overlays, lang, false);
			});
		},

		/** Löscht eine Sprachfassung oder (ohne `lang`) das ganze Dokument. Historie bleibt erhalten. */
		async remove(slug: string, opts: { lang?: string; actor: Actor }): Promise<void> {
			return withLock(`${def.name}/${slug}`, async () => {
				const loaded = await load(slug);
				if (!loaded) throw notFound(`${def.label} „${slug}"`);
				const storage = getStorage();
				const index = await getIndex();
				if (opts.lang) {
					assertLang(opts.lang);
					if (!loaded.overlays[opts.lang]) throw notFound(`Sprachfassung ${opts.lang}`);
					await archive(def.name, slug, opts.lang, opts.actor);
					await storage.remove(paths.overlay(def.name, slug, opts.lang));
					delete loaded.overlays[opts.lang];
					if (Object.keys(loaded.overlays).length) {
						await reindexDocument(def, loaded.base, loaded.overlays);
						return;
					}
				}
				await archive(def.name, slug, 'base', opts.actor);
				for (const l of Object.keys(loaded.overlays)) {
					await archive(def.name, slug, l, opts.actor);
					await storage.remove(paths.overlay(def.name, slug, l));
				}
				await storage.remove(paths.base(def.name, slug));
				await index.removeDocument(def.name, slug);
			});
		},

		async versions(slug: string): Promise<VersionInfo[]> {
			const storage = getStorage();
			const files = await storage.list(paths.historyDir(def.name, slug));
			const out: VersionInfo[] = [];
			for (const file of files) {
				const name = file.split('/').at(-1)?.replace(/\.json$/, '') ?? '';
				const [stamp, part] = name.split('__');
				if (!stamp || !part) continue;
				const st = await storage.stat(file);
				const raw = await storage.read(file);
				let savedBy = '';
				try {
					savedBy = raw ? (JSON.parse(raw).savedBy ?? '') : '';
				} catch {
					/* ignorieren */
				}
				out.push({
					id: name,
					part,
					savedAt: stamp.replace(/^(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z$/, '$1T$2:$3:$4.$5Z'),
					savedBy,
					size: st?.size ?? 0
				});
			}
			return out.sort((a, b) => (a.id < b.id ? 1 : -1));
		},

		/** Stellt eine Version wieder her (der aktuelle Stand wandert vorher in die Historie). */
		async restore(slug: string, versionId: string, actor: Actor): Promise<void> {
			if (!/^[0-9TZ-]+__[a-z-]+$/i.test(versionId)) throw badRequest('Ungültige Versions-ID');
			return withLock(`${def.name}/${slug}`, async () => {
				const raw = await getStorage().read(paths.history(def.name, slug, versionId));
				if (!raw) throw notFound('Version');
				const { part, content } = JSON.parse(raw) as { part: string; content: unknown };
				await archive(def.name, slug, part, actor);
				if (part === 'base') await writeJson(paths.base(def.name, slug), content);
				else await writeJson(paths.overlay(def.name, slug, part), content);
				const loaded = await load(slug);
				if (loaded) await reindexDocument(def, loaded.base, loaded.overlays);
			});
		},

		/** Alle Slugs dieser Collection direkt aus dem Storage (ohne Index). */
		async slugs(): Promise<string[]> {
			const files = await getStorage().list(paths.collectionDir(def.name));
			const slugs = new Set<string>();
			for (const f of files) {
				const parsed = parseContentFile(f.split('/').at(-1) ?? '');
				if (parsed && parsed.lang === null) slugs.add(parsed.slug);
			}
			return [...slugs].sort();
		}
	};
}

export type CollectionApi = ReturnType<typeof collection>;

/** Index komplett aus dem Storage neu aufbauen. */
export async function reindexContent(): Promise<{ documents: number; languages: number }> {
	const index = await getIndex();
	await index.clearDocuments();
	let documents = 0;
	let langs = 0;
	for (const def of Object.values(collections())) {
		const api = collection(def.name);
		for (const slug of await api.slugs()) {
			const base = await readBase(def.name, slug);
			if (!base) continue;
			const overlays = await readOverlays(def.name, slug);
			const rows = indexRows(def, base, overlays);
			if (rows.length) await index.upsertDocument(rows);
			documents++;
			langs += rows.length;
		}
	}
	return { documents, languages: langs };
}
