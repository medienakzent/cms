/**
 * Library API for content. Admin UI, REST routes and CLI use only these
 * functions; there is no second code path.
 */
import { nanoid } from 'nanoid';
import { mergeBlocks, mergeFields, splitBlocks, splitFields } from '../localize';
import { allowedBlocks } from '../registry';
import { getRuntime } from './runtime';
import { isValidSlug } from '../slug';
import { normalizeField, normalizeFields, validateBlocks, validateFields } from '../validate';
import { extractFacets } from '../facets';
import { buildListQuery, isListQuery, QueryError } from '../query';
import { badRequest, CmsError, conflict, notFound, validation } from './errors';
import { getIndex } from './index/index';
import { getStorage, parseContentFile, paths } from './storage';
export const SYSTEM_ACTOR = { id: 'system', name: 'system' };
const now = () => new Date().toISOString();
const blockDefinitions = () => getRuntime().registry.blocks;
const collections = () => getRuntime().registry.collections;
const languages = () => getRuntime().languages;
const defaultLanguage = () => getRuntime().config.defaultLanguage;
function assertLang(lang) {
    if (!languages().includes(lang))
        throw badRequest(`Unbekannte Sprache „${lang}"`);
}
// In-process lock per document
const locks = new Map();
async function withLock(key, callback) {
    const previous = locks.get(key) ?? Promise.resolve();
    const next = previous.catch(() => undefined).then(callback);
    locks.set(key, next);
    try {
        return await next;
    }
    finally {
        if (locks.get(key) === next)
            locks.delete(key);
    }
}
async function readJson(path) {
    const raw = await getStorage().read(path);
    if (raw === null)
        return null;
    try {
        return JSON.parse(raw);
    }
    catch {
        throw new Error(`Storage: ungültiges JSON in ${path}`);
    }
}
const writeJson = (path, data) => getStorage().write(path, JSON.stringify(data, null, 2) + '\n');
async function readBase(collection, slug) {
    return readJson(paths.base(collection, slug));
}
async function readOverlays(collection, slug) {
    const overlays = {};
    for (const lang of languages()) {
        const overlay = await readJson(paths.overlay(collection, slug, lang));
        if (overlay)
            overlays[lang] = overlay;
    }
    return overlays;
}
/** Copies the current state of a file part into the history (versioning). */
async function archive(collection, slug, part, actor) {
    const storage = getStorage();
    const sourcePath = part === 'base' ? paths.base(collection, slug) : paths.overlay(collection, slug, part);
    const raw = await storage.read(sourcePath);
    if (raw === null)
        return;
    const savedAt = now();
    const versionId = `${savedAt.replace(/[:.]/g, '-')}__${part}`;
    await storage.write(paths.history(collection, slug, versionId), JSON.stringify({ savedAt, savedBy: actor.name, part, content: JSON.parse(raw) }, null, 2));
}
function langMeta(overlay) {
    return {
        lang: overlay.lang,
        status: overlay.status,
        updatedAt: overlay.updatedAt,
        updatedBy: overlay.updatedBy,
        publishedAt: overlay.publishedAt
    };
}
function toDocument(definition, base, overlays, lang, fallback) {
    const overlay = overlays[lang];
    const fallbackOverlay = fallback && lang !== defaultLanguage() ? overlays[defaultLanguage()] : undefined;
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
        fields: mergeFields(definition.fields, base.fields, overlay?.fields, fallbackOverlay?.fields),
        blocks: mergeBlocks(blockDefinitions(), base.blocks, overlay?.blocks, fallbackOverlay?.blocks)
    };
}
function collectText(fields, value, texts) {
    for (const [key, field] of Object.entries(fields))
        collectFieldText(field, value?.[key], texts);
}
function collectFieldText(field, value, texts) {
    switch (field.kind) {
        case 'text':
        case 'textarea':
        case 'richtext':
            if (typeof value === 'string' && value)
                texts.push(value);
            break;
        case 'list':
            if (Array.isArray(value))
                for (const item of value)
                    collectFieldText(field.of, item, texts);
            break;
        case 'group':
            collectText(field.fields, value ?? {}, texts);
            break;
        case 'blocks':
            collectBlockText(value ?? [], texts);
            break;
    }
}
function collectBlockText(blocks, texts) {
    for (const block of blocks) {
        const blockDefinition = blockDefinitions()[block.type];
        if (blockDefinition)
            collectText(blockDefinition.fields, block.data, texts);
    }
}
function collectRefs(fields, value, refs) {
    for (const [key, field] of Object.entries(fields)) {
        const fieldValue = value?.[key];
        if (field.kind === 'reference' && typeof fieldValue === 'string')
            refs.add(`${field.collection}:${fieldValue}`);
        else if (field.kind === 'references' && Array.isArray(fieldValue))
            for (const slug of fieldValue)
                refs.add(`${field.collection}:${slug}`);
        else if (field.kind === 'group')
            collectRefs(field.fields, fieldValue ?? {}, refs);
        else if (field.kind === 'list' && Array.isArray(fieldValue))
            for (const item of fieldValue)
                collectRefs({ item: field.of }, { item }, refs);
        else if (field.kind === 'blocks' && Array.isArray(fieldValue))
            for (const block of fieldValue) {
                const blockDefinition = blockDefinitions()[block.type];
                if (blockDefinition)
                    collectRefs(blockDefinition.fields, block.data, refs);
            }
    }
}
function indexRows(definition, base, overlays) {
    return Object.keys(overlays).map((lang) => {
        const document = toDocument(definition, base, overlays, lang, false);
        const texts = [];
        collectText(definition.fields, document.fields, texts);
        collectBlockText(document.blocks, texts);
        const refs = new Set();
        collectRefs(definition.fields, document.fields, refs);
        for (const block of document.blocks) {
            const blockDefinition = blockDefinitions()[block.type];
            if (blockDefinition)
                collectRefs(blockDefinition.fields, block.data, refs);
        }
        return {
            collection: definition.name,
            slug: base.slug,
            lang,
            id: base.id,
            status: document.status,
            title: String(document.fields[definition.titleField] ?? ''),
            excerpt: definition.excerptField
                ? String(document.fields[definition.excerptField] ?? '').slice(0, 300)
                : '',
            search: `${base.slug} ${texts.join(' ')}`.slice(0, 20000),
            refs: [...refs],
            facets: extractFacets(definition.fields, document.fields),
            createdAt: document.createdAt,
            updatedAt: document.updatedAt,
            updatedBy: document.updatedBy,
            publishedAt: document.publishedAt
        };
    });
}
async function reindexDocument(definition, base, overlays) {
    const index = await getIndex();
    await index.pruneLangs(definition.name, base.slug, Object.keys(overlays));
    const rows = indexRows(definition, base, overlays);
    if (rows.length)
        await index.upsertDocument(rows);
}
function prepareInput(definition, input, strict) {
    const fields = normalizeFields(definition.fields, input.fields);
    const allowed = allowedBlocks(definition);
    const blocks = normalizeField({ kind: 'blocks' }, definition.blocks ? input.blocks : []).map((block) => {
        const blockDefinition = blockDefinitions()[block.type];
        return {
            id: block.id || nanoid(8),
            type: block.type,
            data: blockDefinition ? normalizeFields(blockDefinition.fields, block.data) : block.data
        };
    });
    const context = { strict, blocks: blockDefinitions() };
    const issues = validateFields(definition.fields, fields, context);
    validateBlocks(blocks, allowed, context, issues);
    if (issues.length)
        throw validation(issues);
    return { fields, blocks };
}
function assertSlug(slug) {
    if (!isValidSlug(slug))
        throw badRequest(`Ungültiger Slug „${slug}"`);
}
function getDefinition(name) {
    const definition = collections()[name];
    if (!definition)
        throw notFound(`Collection „${name}"`);
    return definition;
}
export function collection(name) {
    const definition = getDefinition(name);
    function toQuery(input) {
        try {
            return buildListQuery(definition, input, languages());
        }
        catch (error) {
            if (error instanceof QueryError)
                throw new CmsError(400, error.message, error.issues);
            throw error;
        }
    }
    async function load(slug) {
        assertSlug(slug);
        const base = await readBase(definition.name, slug);
        if (!base)
            return null;
        return { base, overlays: await readOverlays(definition.name, slug) };
    }
    return {
        definition,
        /** List from the index; filters/sort are validated against the field definitions (CmsError 400). */
        async list(input = {}) {
            const query = isListQuery(input) ? input : toQuery(input);
            if (query.collection !== definition.name)
                throw badRequest('Abfrage gehört zu einer anderen Collection');
            return (await getIndex()).list(query);
        },
        /** Validated query from raw parameters (e.g. URLSearchParams of the API). */
        query: toQuery,
        async get(slug, options = {}) {
            const lang = options.lang ?? defaultLanguage();
            assertLang(lang);
            const loaded = await load(slug);
            if (!loaded)
                return null;
            const overlay = loaded.overlays[lang];
            if (!overlay)
                return null;
            const status = options.status ?? 'published';
            if (status !== 'all' && overlay.status !== status)
                return null;
            return toDocument(definition, loaded.base, loaded.overlays, lang, options.fallback ?? true);
        },
        /** For the editor: no fallback, any status; a missing language is an empty translation. */
        async getEditable(slug, lang) {
            assertLang(lang);
            const loaded = await load(slug);
            if (!loaded)
                return null;
            return {
                exists: !!loaded.overlays[lang],
                doc: toDocument(definition, loaded.base, loaded.overlays, lang, false)
            };
        },
        async exists(slug) {
            assertSlug(slug);
            return getStorage().exists(paths.base(definition.name, slug));
        },
        async create(options) {
            const lang = options.lang ?? defaultLanguage();
            assertLang(lang);
            assertSlug(options.slug);
            return withLock(`${definition.name}/${options.slug}`, async () => {
                if (await getStorage().exists(paths.base(definition.name, options.slug))) {
                    throw conflict(`„${options.slug}" existiert bereits in ${definition.labelPlural}`);
                }
                const status = options.status ?? 'draft';
                const { fields, blocks } = prepareInput(definition, { fields: options.input?.fields ?? {}, blocks: options.input?.blocks ?? [] }, status === 'published');
                const timestamp = now();
                const splitFieldValues = splitFields(definition.fields, fields);
                const splitBlockValues = splitBlocks(blockDefinitions(), blocks);
                const base = {
                    id: nanoid(12),
                    collection: definition.name,
                    slug: options.slug,
                    schemaVersion: definition.version,
                    createdAt: timestamp,
                    createdBy: options.actor.name,
                    updatedAt: timestamp,
                    updatedBy: options.actor.name,
                    fields: splitFieldValues.base,
                    blocks: splitBlockValues.base
                };
                const overlay = {
                    lang,
                    status,
                    updatedAt: timestamp,
                    updatedBy: options.actor.name,
                    publishedAt: status === 'published' ? timestamp : null,
                    fields: splitFieldValues.local,
                    blocks: splitBlockValues.local
                };
                await writeJson(paths.base(definition.name, options.slug), base);
                await writeJson(paths.overlay(definition.name, options.slug, lang), overlay);
                const overlays = { [lang]: overlay };
                await reindexDocument(definition, base, overlays);
                return toDocument(definition, base, overlays, lang, false);
            });
        },
        /** Saves one language version; non-localized fields and block structure are shared (base file). */
        async save(slug, lang, input, options) {
            assertLang(lang);
            return withLock(`${definition.name}/${slug}`, async () => {
                const loaded = await load(slug);
                if (!loaded)
                    throw notFound(`${definition.label} „${slug}"`);
                const { base, overlays } = loaded;
                const previous = overlays[lang];
                const status = options.status ?? previous?.status ?? 'draft';
                const { fields, blocks } = prepareInput(definition, input, status === 'published');
                const timestamp = now();
                const splitFieldValues = splitFields(definition.fields, fields);
                const splitBlockValues = splitBlocks(blockDefinitions(), blocks);
                await archive(definition.name, slug, 'base', options.actor);
                await archive(definition.name, slug, lang, options.actor);
                const newBase = {
                    ...base,
                    schemaVersion: definition.version,
                    updatedAt: timestamp,
                    updatedBy: options.actor.name,
                    fields: splitFieldValues.base,
                    blocks: splitBlockValues.base
                };
                const newOverlay = {
                    lang,
                    status,
                    updatedAt: timestamp,
                    updatedBy: options.actor.name,
                    publishedAt: status === 'published'
                        ? (previous?.publishedAt ?? timestamp)
                        : (previous?.publishedAt ?? null),
                    fields: splitFieldValues.local,
                    blocks: splitBlockValues.local
                };
                await writeJson(paths.base(definition.name, slug), newBase);
                await writeJson(paths.overlay(definition.name, slug, lang), newOverlay);
                overlays[lang] = newOverlay;
                // Drop entries of deleted blocks from the other languages' overlays
                const liveIds = new Set(blocks.map((block) => block.id));
                for (const [otherLang, otherOverlay] of Object.entries(overlays)) {
                    if (otherLang === lang)
                        continue;
                    const orphanIds = Object.keys(otherOverlay.blocks ?? {}).filter((id) => !liveIds.has(id));
                    if (orphanIds.length) {
                        for (const id of orphanIds)
                            delete otherOverlay.blocks[id];
                        await writeJson(paths.overlay(definition.name, slug, otherLang), otherOverlay);
                    }
                }
                await reindexDocument(definition, newBase, overlays);
                return toDocument(definition, newBase, overlays, lang, false);
            });
        },
        async setStatus(slug, lang, status, actor) {
            assertLang(lang);
            return withLock(`${definition.name}/${slug}`, async () => {
                const loaded = await load(slug);
                const overlay = loaded?.overlays[lang];
                if (!loaded || !overlay)
                    throw notFound(`${definition.label} „${slug}" (${lang})`);
                if (status === 'published') {
                    const document = toDocument(definition, loaded.base, loaded.overlays, lang, false);
                    prepareInput(definition, { fields: document.fields, blocks: document.blocks }, true);
                }
                await archive(definition.name, slug, lang, actor);
                overlay.status = status;
                overlay.updatedAt = now();
                overlay.updatedBy = actor.name;
                if (status === 'published')
                    overlay.publishedAt = overlay.publishedAt ?? overlay.updatedAt;
                await writeJson(paths.overlay(definition.name, slug, lang), overlay);
                await reindexDocument(definition, loaded.base, loaded.overlays);
                return toDocument(definition, loaded.base, loaded.overlays, lang, false);
            });
        },
        /** Removes one language version or (without `lang`) the whole document; history is kept. */
        async remove(slug, options) {
            return withLock(`${definition.name}/${slug}`, async () => {
                const loaded = await load(slug);
                if (!loaded)
                    throw notFound(`${definition.label} „${slug}"`);
                const storage = getStorage();
                const index = await getIndex();
                if (options.lang) {
                    assertLang(options.lang);
                    if (!loaded.overlays[options.lang])
                        throw notFound(`Sprachfassung ${options.lang}`);
                    await archive(definition.name, slug, options.lang, options.actor);
                    await storage.remove(paths.overlay(definition.name, slug, options.lang));
                    delete loaded.overlays[options.lang];
                    if (Object.keys(loaded.overlays).length) {
                        await reindexDocument(definition, loaded.base, loaded.overlays);
                        return;
                    }
                }
                await archive(definition.name, slug, 'base', options.actor);
                for (const overlayLang of Object.keys(loaded.overlays)) {
                    await archive(definition.name, slug, overlayLang, options.actor);
                    await storage.remove(paths.overlay(definition.name, slug, overlayLang));
                }
                await storage.remove(paths.base(definition.name, slug));
                await index.removeDocument(definition.name, slug);
            });
        },
        async versions(slug) {
            assertSlug(slug);
            const storage = getStorage();
            const files = await storage.list(paths.historyDir(definition.name, slug));
            const versions = [];
            for (const file of files) {
                const name = file
                    .split('/')
                    .at(-1)
                    ?.replace(/\.json$/, '') ?? '';
                const [stamp, part] = name.split('__');
                if (!stamp || !part)
                    continue;
                const stat = await storage.stat(file);
                const raw = await storage.read(file);
                let savedBy = '';
                try {
                    savedBy = raw ? (JSON.parse(raw).savedBy ?? '') : '';
                }
                catch {
                    // unreadable version file: keep savedBy empty
                }
                versions.push({
                    id: name,
                    part,
                    savedAt: stamp.replace(/^(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z$/, '$1T$2:$3:$4.$5Z'),
                    savedBy,
                    size: stat?.size ?? 0
                });
            }
            return versions.sort((left, right) => (left.id < right.id ? 1 : -1));
        },
        /** Restores a version; the current state is archived first. */
        async restore(slug, versionId, actor) {
            assertSlug(slug);
            if (!/^[0-9TZ-]+__[a-z-]+$/i.test(versionId))
                throw badRequest('Ungültige Versions-ID');
            return withLock(`${definition.name}/${slug}`, async () => {
                const raw = await getStorage().read(paths.history(definition.name, slug, versionId));
                if (!raw)
                    throw notFound('Version');
                const { part, content } = JSON.parse(raw);
                if (part !== 'base' && !languages().includes(part))
                    throw badRequest('Ungültige Version');
                await archive(definition.name, slug, part, actor);
                if (part === 'base')
                    await writeJson(paths.base(definition.name, slug), content);
                else
                    await writeJson(paths.overlay(definition.name, slug, part), content);
                const loaded = await load(slug);
                if (loaded)
                    await reindexDocument(definition, loaded.base, loaded.overlays);
            });
        },
        /** All slugs of this collection straight from the storage (no index). */
        async slugs() {
            const files = await getStorage().list(paths.collectionDir(definition.name));
            const slugs = new Set();
            for (const file of files) {
                const parsed = parseContentFile(file.split('/').at(-1) ?? '');
                if (parsed && parsed.lang === null)
                    slugs.add(parsed.slug);
            }
            return [...slugs].sort();
        }
    };
}
/** Rebuilds the whole index from the storage. */
export async function reindexContent() {
    const index = await getIndex();
    await index.clearDocuments();
    let documents = 0;
    let languageCount = 0;
    for (const definition of Object.values(collections())) {
        const api = collection(definition.name);
        for (const slug of await api.slugs()) {
            const base = await readBase(definition.name, slug);
            if (!base)
                continue;
            const overlays = await readOverlays(definition.name, slug);
            const rows = indexRows(definition, base, overlays);
            if (rows.length)
                await index.upsertDocument(rows);
            documents++;
            languageCount += rows.length;
        }
    }
    return { documents, languages: languageCount };
}
