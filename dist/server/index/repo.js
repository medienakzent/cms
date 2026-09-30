export const INDEX_SCHEMA_VERSION = 2;
const META = `
CREATE TABLE IF NOT EXISTS cms_meta (
	key TEXT PRIMARY KEY,
	value TEXT NOT NULL
);`;
const DOCUMENTS = `
CREATE TABLE IF NOT EXISTS cms_documents (
	collection TEXT NOT NULL,
	slug TEXT NOT NULL,
	lang TEXT NOT NULL,
	id TEXT NOT NULL,
	status TEXT NOT NULL,
	title TEXT NOT NULL DEFAULT '',
	excerpt TEXT NOT NULL DEFAULT '',
	search TEXT NOT NULL DEFAULT '',
	refs TEXT NOT NULL DEFAULT '[]',
	created_at TEXT NOT NULL,
	updated_at TEXT NOT NULL,
	updated_by TEXT NOT NULL DEFAULT '',
	published_at TEXT,
	PRIMARY KEY (collection, slug, lang)
);
CREATE INDEX IF NOT EXISTS cms_documents_list ON cms_documents (collection, lang, status);
CREATE TABLE IF NOT EXISTS cms_facets (
	collection TEXT NOT NULL,
	slug TEXT NOT NULL,
	lang TEXT NOT NULL,
	field TEXT NOT NULL,
	value_text TEXT NOT NULL,
	value_num REAL
);
CREATE INDEX IF NOT EXISTS cms_facets_doc ON cms_facets (collection, slug, lang);
CREATE INDEX IF NOT EXISTS cms_facets_lookup ON cms_facets (collection, field, value_text);
CREATE INDEX IF NOT EXISTS cms_facets_num ON cms_facets (collection, field, value_num);`;
const MEDIA = `
CREATE TABLE IF NOT EXISTS cms_media (
	id TEXT PRIMARY KEY,
	src TEXT NOT NULL,
	mime TEXT NOT NULL,
	kind TEXT NOT NULL,
	width INTEGER,
	height INTEGER,
	alt TEXT NOT NULL DEFAULT '',
	variants TEXT NOT NULL DEFAULT '{}',
	original_name TEXT NOT NULL DEFAULT '',
	size INTEGER NOT NULL DEFAULT 0,
	created_at TEXT NOT NULL,
	created_by TEXT NOT NULL DEFAULT ''
);`;
function toIndexRow(row) {
    return {
        collection: row.collection,
        slug: row.slug,
        lang: row.lang,
        id: row.id,
        status: row.status,
        title: row.title,
        excerpt: row.excerpt,
        refs: JSON.parse(row.refs || '[]'),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        updatedBy: row.updated_by,
        publishedAt: row.published_at
    };
}
function toMediaItem(row) {
    return {
        id: row.id,
        src: row.src,
        mime: row.mime,
        kind: row.kind,
        width: row.width,
        height: row.height,
        alt: row.alt,
        variants: JSON.parse(row.variants || '{}'),
        originalName: row.original_name,
        size: Number(row.size),
        createdAt: row.created_at,
        createdBy: row.created_by
    };
}
const COLUMN_SORT = {
    updatedAt: 'd.updated_at',
    createdAt: 'd.created_at',
    publishedAt: 'd.published_at',
    title: 'd.title',
    slug: 'd.slug'
};
/** LIKE pattern with wildcards and the escape character escaped. */
function likePattern(value) {
    return `%${value.replace(/[\\%_]/g, (character) => `\\${character}`)}%`;
}
/** One filter condition as an EXISTS subquery on the facet index (portable SQL). */
function filterSql(filter, params) {
    const column = filter.mode === 'num'
        ? 'f.value_num'
        : filter.mode === 'itext'
            ? 'LOWER(f.value_text)'
            : 'f.value_text';
    const normalizeValue = (value) => filter.mode === 'itext' && typeof value === 'string' ? value.toLowerCase() : value;
    let condition;
    let negate = false;
    switch (filter.op) {
        case 'eq':
        case 'ne':
            condition = `${column} = ?`;
            params.push(normalizeValue(filter.value));
            negate = filter.op === 'ne';
            break;
        case 'in':
        case 'nin': {
            const values = filter.value;
            condition = `${column} IN (${values.map(() => '?').join(', ')})`;
            params.push(...values.map(normalizeValue));
            negate = filter.op === 'nin';
            break;
        }
        case 'lt':
        case 'lte':
        case 'gt':
        case 'gte': {
            const operatorSql = { lt: '<', lte: '<=', gt: '>', gte: '>=' }[filter.op];
            condition = `${column} ${operatorSql} ?`;
            params.push(normalizeValue(filter.value));
            break;
        }
        case 'contains':
            condition = `${column} LIKE ? ESCAPE '\\'`;
            params.push(likePattern(String(filter.value).toLowerCase()));
            break;
    }
    params.push(filter.field);
    // The field parameter is pushed last, so the SQL places the condition before the field name
    const subquery = `SELECT 1 FROM cms_facets f WHERE f.collection = d.collection AND f.slug = d.slug AND f.lang = d.lang AND (${condition}) AND f.field = ?`;
    return `${negate ? 'NOT ' : ''}EXISTS (${subquery})`;
}
export function createIndexRepo(db) {
    return {
        /** Creates the tables; `reset: true` means the document index must be rebuilt. */
        async ensureSchema() {
            await db.exec(META);
            const row = await db.get('SELECT value FROM cms_meta WHERE key = ?', [
                'index_schema'
            ]);
            const current = row ? Number(row.value) : 0;
            let reset = false;
            if (current !== INDEX_SCHEMA_VERSION) {
                await db.exec('DROP TABLE IF EXISTS cms_documents; DROP TABLE IF EXISTS cms_facets;');
                reset = true;
            }
            await db.exec(DOCUMENTS);
            await db.exec(MEDIA);
            await db.run(`INSERT INTO cms_meta (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value`, ['index_schema', String(INDEX_SCHEMA_VERSION)]);
            return { reset };
        },
        async upsertDocument(rows) {
            await db.transaction(async () => {
                for (const row of rows) {
                    await db.run(`INSERT INTO cms_documents (collection, slug, lang, id, status, title, excerpt, search, refs, created_at, updated_at, updated_by, published_at)
						 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
						 ON CONFLICT (collection, slug, lang) DO UPDATE SET
						   id = excluded.id, status = excluded.status, title = excluded.title, excerpt = excluded.excerpt,
						   search = excluded.search, refs = excluded.refs,
						   created_at = excluded.created_at, updated_at = excluded.updated_at,
						   updated_by = excluded.updated_by, published_at = excluded.published_at`, [
                        row.collection,
                        row.slug,
                        row.lang,
                        row.id,
                        row.status,
                        row.title,
                        row.excerpt,
                        row.search,
                        JSON.stringify(row.refs),
                        row.createdAt,
                        row.updatedAt,
                        row.updatedBy,
                        row.publishedAt
                    ]);
                    await db.run('DELETE FROM cms_facets WHERE collection = ? AND slug = ? AND lang = ?', [
                        row.collection,
                        row.slug,
                        row.lang
                    ]);
                    for (const facet of row.facets) {
                        await db.run('INSERT INTO cms_facets (collection, slug, lang, field, value_text, value_num) VALUES (?, ?, ?, ?, ?, ?)', [row.collection, row.slug, row.lang, facet.field, facet.text, facet.num]);
                    }
                }
            });
        },
        async removeDocument(collection, slug, lang) {
            const where = lang
                ? 'collection = ? AND slug = ? AND lang = ?'
                : 'collection = ? AND slug = ?';
            const params = lang ? [collection, slug, lang] : [collection, slug];
            await db.run(`DELETE FROM cms_documents WHERE ${where}`, params);
            await db.run(`DELETE FROM cms_facets WHERE ${where}`, params);
        },
        /** Removes languages that no longer exist in the storage. */
        async pruneLangs(collection, slug, keep) {
            const rows = await db.all('SELECT lang FROM cms_documents WHERE collection = ? AND slug = ?', [collection, slug]);
            for (const row of rows)
                if (!keep.includes(row.lang))
                    await this.removeDocument(collection, slug, row.lang);
        },
        async clearDocuments() {
            await db.run('DELETE FROM cms_documents');
            await db.run('DELETE FROM cms_facets');
        },
        async list(query) {
            const where = ['d.collection = ?'];
            const params = [query.collection];
            if (query.lang) {
                where.push('d.lang = ?');
                params.push(query.lang);
            }
            if (query.status !== 'all') {
                where.push('d.status = ?');
                params.push(query.status);
            }
            if (query.q) {
                where.push("LOWER(d.search) LIKE ? ESCAPE '\\'");
                params.push(likePattern(query.q.toLowerCase()));
            }
            for (const filter of query.filters)
                where.push(filterSql(filter, params));
            const whereSql = where.join(' AND ');
            const total = await db.get(`SELECT COUNT(*) AS count FROM cms_documents d WHERE ${whereSql}`, params);
            let join = '';
            let orderColumn;
            const listParams = [...params];
            if (query.sort.kind === 'column') {
                orderColumn = COLUMN_SORT[query.sort.field] ?? 'd.updated_at';
            }
            else {
                join =
                    'LEFT JOIN cms_facets s ON s.collection = d.collection AND s.slug = d.slug AND s.lang = d.lang AND s.field = ?';
                // JOIN parameters precede the WHERE parameters in SQL order
                listParams.unshift(query.sort.field);
                orderColumn =
                    query.sort.mode === 'num'
                        ? 's.value_num'
                        : query.sort.mode === 'itext'
                            ? 'LOWER(s.value_text)'
                            : 's.value_text';
            }
            const direction = query.sort.direction === 'asc' ? 'ASC' : 'DESC';
            const rows = await db.all(`SELECT d.* FROM cms_documents d ${join} WHERE ${whereSql} ORDER BY ${orderColumn} ${direction}, d.slug ASC, d.lang ASC LIMIT ? OFFSET ?`, [...listParams, query.limit, query.offset]);
            return { items: rows.map(toIndexRow), total: Number(total?.count ?? 0) };
        },
        async countByCollection() {
            const rows = await db.all('SELECT collection, COUNT(DISTINCT slug) AS count FROM cms_documents GROUP BY collection');
            return Object.fromEntries(rows.map((row) => [row.collection, Number(row.count)]));
        },
        async insertMedia(mediaItem) {
            await db.run(`INSERT INTO cms_media (id, src, mime, kind, width, height, alt, variants, original_name, size, created_at, created_by)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
				 ON CONFLICT (id) DO UPDATE SET src = excluded.src, mime = excluded.mime, kind = excluded.kind,
				   width = excluded.width, height = excluded.height, alt = excluded.alt, variants = excluded.variants,
				   original_name = excluded.original_name, size = excluded.size`, [
                mediaItem.id,
                mediaItem.src,
                mediaItem.mime,
                mediaItem.kind,
                mediaItem.width,
                mediaItem.height,
                mediaItem.alt,
                JSON.stringify(mediaItem.variants),
                mediaItem.originalName,
                mediaItem.size,
                mediaItem.createdAt,
                mediaItem.createdBy
            ]);
        },
        async updateMediaAlt(id, alt) {
            await db.run('UPDATE cms_media SET alt = ? WHERE id = ?', [alt, id]);
        },
        async getMedia(id) {
            const row = await db.get('SELECT * FROM cms_media WHERE id = ?', [id]);
            return row ? toMediaItem(row) : null;
        },
        async listMedia(options = {}) {
            const where = ['1 = 1'];
            const params = [];
            if (options.kind && options.kind !== 'any') {
                where.push('kind = ?');
                params.push(options.kind);
            }
            if (options.q) {
                where.push("(LOWER(original_name) LIKE ? ESCAPE '\\' OR LOWER(alt) LIKE ? ESCAPE '\\')");
                const pattern = likePattern(options.q.toLowerCase());
                params.push(pattern, pattern);
            }
            const whereSql = where.join(' AND ');
            const total = await db.get(`SELECT COUNT(*) AS count FROM cms_media WHERE ${whereSql}`, params);
            const rows = await db.all(`SELECT * FROM cms_media WHERE ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`, [...params, Math.min(options.limit ?? 60, 500), options.offset ?? 0]);
            return { items: rows.map(toMediaItem), total: Number(total?.count ?? 0) };
        },
        async removeMedia(id) {
            await db.run('DELETE FROM cms_media WHERE id = ?', [id]);
        },
        async clearMedia() {
            await db.run('DELETE FROM cms_media');
        }
    };
}
