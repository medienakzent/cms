/**
 * Index-Repository: abgeleitete Daten für Listen, Filter, Suche und Verweise.
 * Alles hier kann per `cms.reindex()` aus dem Storage neu erzeugt werden.
 * Ändert sich das Schema, INDEX_SCHEMA_VERSION erhöhen — die Tabellen werden
 * dann beim Start verworfen und neu aufgebaut.
 */
import type { Facet } from '../../facets';
import type { Filter, ListQuery } from '../../query';
import type { DocumentStatus, IndexRow, MediaItem } from '../../types';
import type { DbDriver } from '../db/driver';

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

interface DocRow {
	collection: string;
	slug: string;
	lang: string;
	id: string;
	status: string;
	title: string;
	excerpt: string;
	refs: string;
	created_at: string;
	updated_at: string;
	updated_by: string;
	published_at: string | null;
}

interface MediaRow {
	id: string;
	src: string;
	mime: string;
	kind: string;
	width: number | null;
	height: number | null;
	alt: string;
	variants: string;
	original_name: string;
	size: number;
	created_at: string;
	created_by: string;
}

function toIndexRow(r: DocRow): IndexRow {
	return {
		collection: r.collection,
		slug: r.slug,
		lang: r.lang,
		id: r.id,
		status: r.status as DocumentStatus,
		title: r.title,
		excerpt: r.excerpt,
		refs: JSON.parse(r.refs || '[]'),
		createdAt: r.created_at,
		updatedAt: r.updated_at,
		updatedBy: r.updated_by,
		publishedAt: r.published_at
	};
}

function toMediaItem(r: MediaRow): MediaItem {
	return {
		id: r.id,
		src: r.src,
		mime: r.mime,
		kind: r.kind as MediaItem['kind'],
		width: r.width,
		height: r.height,
		alt: r.alt,
		variants: JSON.parse(r.variants || '{}'),
		originalName: r.original_name,
		size: Number(r.size),
		createdAt: r.created_at,
		createdBy: r.created_by
	};
}

export type IndexDocument = IndexRow & { search: string; facets: Facet[] };

const COLUMN_SORT: Record<string, string> = {
	updatedAt: 'd.updated_at',
	createdAt: 'd.created_at',
	publishedAt: 'd.published_at',
	title: 'd.title',
	slug: 'd.slug'
};

/** Eine Filterbedingung als EXISTS-Unterabfrage auf den Facetten-Index (portables SQL). */
function filterSql(f: Filter, params: unknown[]): string {
	const col =
		f.mode === 'num' ? 'f.value_num' : f.mode === 'itext' ? 'LOWER(f.value_text)' : 'f.value_text';
	const wrap = (v: string | number) =>
		f.mode === 'itext' && typeof v === 'string' ? v.toLowerCase() : v;
	let cond: string;
	let negate = false;
	switch (f.op) {
		case 'eq':
		case 'ne':
			cond = `${col} = ?`;
			params.push(wrap(f.value as string | number));
			negate = f.op === 'ne';
			break;
		case 'in':
		case 'nin': {
			const list = f.value as (string | number)[];
			cond = `${col} IN (${list.map(() => '?').join(', ')})`;
			params.push(...list.map(wrap));
			negate = f.op === 'nin';
			break;
		}
		case 'lt':
		case 'lte':
		case 'gt':
		case 'gte': {
			const opSql = { lt: '<', lte: '<=', gt: '>', gte: '>=' }[f.op];
			cond = `${col} ${opSql} ?`;
			params.push(wrap(f.value as string | number));
			break;
		}
		case 'contains':
			cond = `${col} LIKE ?`;
			params.push(`%${String(f.value).toLowerCase().replace(/[%_]/g, '')}%`);
			break;
	}
	params.push(f.field);
	// Feldparameter steht am Ende → SQL-Reihenfolge entsprechend: Bedingung zuerst, dann Feldname.
	const sub = `SELECT 1 FROM cms_facets f WHERE f.collection = d.collection AND f.slug = d.slug AND f.lang = d.lang AND (${cond}) AND f.field = ?`;
	return `${negate ? 'NOT ' : ''}EXISTS (${sub})`;
}

export function createIndexRepo(db: DbDriver) {
	return {
		/** Legt Tabellen an; liefert `reset: true`, wenn der Dokument-Index neu aufgebaut werden muss. */
		async ensureSchema(): Promise<{ reset: boolean }> {
			await db.exec(META);
			const row = await db.get<{ value: string }>('SELECT value FROM cms_meta WHERE key = ?', [
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
			await db.run(
				`INSERT INTO cms_meta (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value`,
				['index_schema', String(INDEX_SCHEMA_VERSION)]
			);
			return { reset };
		},

		async upsertDocument(rows: IndexDocument[]) {
			await db.transaction(async () => {
				for (const r of rows) {
					await db.run(
						`INSERT INTO cms_documents (collection, slug, lang, id, status, title, excerpt, search, refs, created_at, updated_at, updated_by, published_at)
						 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
						 ON CONFLICT (collection, slug, lang) DO UPDATE SET
						   id = excluded.id, status = excluded.status, title = excluded.title, excerpt = excluded.excerpt,
						   search = excluded.search, refs = excluded.refs,
						   created_at = excluded.created_at, updated_at = excluded.updated_at,
						   updated_by = excluded.updated_by, published_at = excluded.published_at`,
						[
							r.collection,
							r.slug,
							r.lang,
							r.id,
							r.status,
							r.title,
							r.excerpt,
							r.search,
							JSON.stringify(r.refs),
							r.createdAt,
							r.updatedAt,
							r.updatedBy,
							r.publishedAt
						]
					);
					await db.run('DELETE FROM cms_facets WHERE collection = ? AND slug = ? AND lang = ?', [
						r.collection,
						r.slug,
						r.lang
					]);
					for (const f of r.facets) {
						await db.run(
							'INSERT INTO cms_facets (collection, slug, lang, field, value_text, value_num) VALUES (?, ?, ?, ?, ?, ?)',
							[r.collection, r.slug, r.lang, f.field, f.text, f.num]
						);
					}
				}
			});
		},

		async removeDocument(collection: string, slug: string, lang?: string) {
			const where = lang
				? 'collection = ? AND slug = ? AND lang = ?'
				: 'collection = ? AND slug = ?';
			const params = lang ? [collection, slug, lang] : [collection, slug];
			await db.run(`DELETE FROM cms_documents WHERE ${where}`, params);
			await db.run(`DELETE FROM cms_facets WHERE ${where}`, params);
		},

		/** Sprachen entfernen, die nicht mehr im Storage existieren. */
		async pruneLangs(collection: string, slug: string, keep: string[]) {
			const rows = await db.all<{ lang: string }>(
				'SELECT lang FROM cms_documents WHERE collection = ? AND slug = ?',
				[collection, slug]
			);
			for (const r of rows)
				if (!keep.includes(r.lang)) await this.removeDocument(collection, slug, r.lang);
		},

		async clearDocuments() {
			await db.run('DELETE FROM cms_documents');
			await db.run('DELETE FROM cms_facets');
		},

		async list(query: ListQuery): Promise<{ items: IndexRow[]; total: number }> {
			const where: string[] = ['d.collection = ?'];
			const params: unknown[] = [query.collection];
			if (query.lang) {
				where.push('d.lang = ?');
				params.push(query.lang);
			}
			if (query.status !== 'all') {
				where.push('d.status = ?');
				params.push(query.status);
			}
			if (query.q) {
				where.push('LOWER(d.search) LIKE ?');
				params.push(`%${query.q.toLowerCase()}%`);
			}
			for (const f of query.filters) where.push(filterSql(f, params));
			const w = where.join(' AND ');

			const total = await db.get<{ n: number }>(
				`SELECT COUNT(*) AS n FROM cms_documents d WHERE ${w}`,
				params
			);

			let join = '';
			let orderCol: string;
			const listParams = [...params];
			if (query.sort.kind === 'column') {
				orderCol = COLUMN_SORT[query.sort.field] ?? 'd.updated_at';
			} else {
				join =
					'LEFT JOIN cms_facets s ON s.collection = d.collection AND s.slug = d.slug AND s.lang = d.lang AND s.field = ?';
				// JOIN-Parameter kommen in der SQL-Reihenfolge VOR den WHERE-Parametern.
				listParams.unshift(query.sort.field);
				orderCol =
					query.sort.mode === 'num'
						? 's.value_num'
						: query.sort.mode === 'itext'
							? 'LOWER(s.value_text)'
							: 's.value_text';
			}
			const dir = query.sort.direction === 'asc' ? 'ASC' : 'DESC';
			const rows = await db.all<DocRow>(
				`SELECT d.* FROM cms_documents d ${join} WHERE ${w} ORDER BY ${orderCol} ${dir}, d.slug ASC, d.lang ASC LIMIT ? OFFSET ?`,
				[...listParams, query.limit, query.offset]
			);
			return { items: rows.map(toIndexRow), total: Number(total?.n ?? 0) };
		},

		async getLangs(collection: string, slug: string): Promise<IndexRow[]> {
			const rows = await db.all<DocRow>(
				'SELECT * FROM cms_documents WHERE collection = ? AND slug = ? ORDER BY lang',
				[collection, slug]
			);
			return rows.map(toIndexRow);
		},

		async countByCollection(): Promise<Record<string, number>> {
			const rows = await db.all<{ collection: string; n: number }>(
				'SELECT collection, COUNT(DISTINCT slug) AS n FROM cms_documents GROUP BY collection'
			);
			return Object.fromEntries(rows.map((r) => [r.collection, Number(r.n)]));
		},

		// ── Medien ──────────────────────────────────────────────────────────
		async insertMedia(m: MediaItem) {
			await db.run(
				`INSERT INTO cms_media (id, src, mime, kind, width, height, alt, variants, original_name, size, created_at, created_by)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
				 ON CONFLICT (id) DO UPDATE SET src = excluded.src, mime = excluded.mime, kind = excluded.kind,
				   width = excluded.width, height = excluded.height, alt = excluded.alt, variants = excluded.variants,
				   original_name = excluded.original_name, size = excluded.size`,
				[
					m.id,
					m.src,
					m.mime,
					m.kind,
					m.width,
					m.height,
					m.alt,
					JSON.stringify(m.variants),
					m.originalName,
					m.size,
					m.createdAt,
					m.createdBy
				]
			);
		},

		async updateMediaAlt(id: string, alt: string) {
			await db.run('UPDATE cms_media SET alt = ? WHERE id = ?', [alt, id]);
		},

		async getMedia(id: string): Promise<MediaItem | null> {
			const r = await db.get<MediaRow>('SELECT * FROM cms_media WHERE id = ?', [id]);
			return r ? toMediaItem(r) : null;
		},

		async listMedia(opts: { kind?: string; q?: string; limit?: number; offset?: number } = {}) {
			const where: string[] = ['1 = 1'];
			const params: unknown[] = [];
			if (opts.kind && opts.kind !== 'any') {
				where.push('kind = ?');
				params.push(opts.kind);
			}
			if (opts.q) {
				where.push('(LOWER(original_name) LIKE ? OR LOWER(alt) LIKE ?)');
				params.push(`%${opts.q.toLowerCase()}%`, `%${opts.q.toLowerCase()}%`);
			}
			const w = where.join(' AND ');
			const total = await db.get<{ n: number }>(
				`SELECT COUNT(*) AS n FROM cms_media WHERE ${w}`,
				params
			);
			const rows = await db.all<MediaRow>(
				`SELECT * FROM cms_media WHERE ${w} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
				[...params, Math.min(opts.limit ?? 60, 500), opts.offset ?? 0]
			);
			return { items: rows.map(toMediaItem), total: Number(total?.n ?? 0) };
		},

		async removeMedia(id: string) {
			await db.run('DELETE FROM cms_media WHERE id = ?', [id]);
		},

		async clearMedia() {
			await db.run('DELETE FROM cms_media');
		}
	};
}

export type IndexRepo = ReturnType<typeof createIndexRepo>;
