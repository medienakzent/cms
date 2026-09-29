/**
 * Abfragesprache für Listen — EINE Definition für Bibliothek, REST-API und Admin.
 *
 * URL-Form (REST):
 *   ?lang=de&status=published&q=suchtext&limit=20&offset=0&sort=-publishedOn
 *   &filter[category]=news                → eq
 *   &filter[year][gte]=2024               → Operator in eckigen Klammern
 *   &filter[tags][in]=a,b                 → Listen kommagetrennt
 *   &filter[seo.noindex]=false            → Gruppenfelder mit Punkt
 *
 * Alles wird gegen die Collection-Definition geprüft: unbekannte Parameter,
 * Felder, Operatoren oder falsch typisierte Werte ergeben 400 mit Fehlerliste.
 * Filter sind UND-verknüpft.
 */
import type { CollectionDefinition } from './collection';
import type { Field, FieldMap } from './fields';
import { optionValue } from './fields';
import { isValidSlug } from './slug';
import type { DocumentStatus, ValidationIssue } from './types';

export const FILTER_OPS = ['eq', 'ne', 'in', 'nin', 'lt', 'lte', 'gt', 'gte', 'contains'] as const;
export type FilterOp = (typeof FILTER_OPS)[number];

/** Wie der Wert im Facetten-Index verglichen wird. */
export type CompareMode = 'text' | 'itext' | 'num';

export interface Filter {
	field: string;
	op: FilterOp;
	/** Bereits typisiert: Zahl für num, sonst String; Arrays für in/nin. */
	value: string | number | (string | number)[];
	mode: CompareMode;
}

export const BUILTIN_SORT = ['updatedAt', 'createdAt', 'publishedAt', 'title', 'slug'] as const;
export type BuiltinSort = (typeof BUILTIN_SORT)[number];

export interface Sort {
	field: string;
	direction: 'asc' | 'desc';
	/** `column`: Spalte der Dokumenttabelle, `facet`: Feldwert aus dem Facetten-Index */
	kind: 'column' | 'facet';
	mode: CompareMode;
}

export interface ListQuery {
	collection: string;
	lang?: string;
	status: DocumentStatus | 'all';
	q?: string;
	filters: Filter[];
	sort: Sort;
	limit: number;
	offset: number;
}

/** Eingabeform für die Bibliothek — alles optional, wird über `buildListQuery` geprüft. */
/** Erkennt eine bereits geprüfte Abfrage (aus `parseListQuery`/`buildListQuery`). */
export function isListQuery(v: ListQueryInput | ListQuery): v is ListQuery {
	return 'collection' in v && typeof v.sort === 'object' && v.sort !== null && 'kind' in v.sort;
}

export interface ListQueryInput {
	lang?: string;
	status?: DocumentStatus | 'all';
	q?: string;
	filters?: { field: string; op?: FilterOp; value: unknown }[];
	sort?: string | { field: string; direction?: 'asc' | 'desc' };
	limit?: number;
	offset?: number;
}

export const LIMITS = {
	maxLimit: 200,
	defaultLimit: 50,
	maxOffset: 100_000,
	maxQ: 200,
	maxInValues: 50
};

export class QueryError extends Error {
	issues: ValidationIssue[];
	constructor(issues: ValidationIssue[]) {
		super('Ungültige Abfrage');
		this.name = 'QueryError';
		this.issues = issues;
	}
}

// ── Felder ──────────────────────────────────────────────────────────────────

/** Feldarten, die im Facetten-Index landen und damit filter-/sortierbar sind. */
const FACET_KINDS = new Set<Field['kind']>([
	'text',
	'number',
	'boolean',
	'date',
	'select',
	'multiselect',
	'reference',
	'references'
]);
const MULTI_KINDS = new Set<Field['kind']>(['multiselect', 'references']);

export function compareMode(field: Field): CompareMode {
	switch (field.kind) {
		case 'number':
		case 'date':
		case 'boolean':
			return 'num';
		case 'text':
			return 'itext';
		default:
			return 'text';
	}
}

/** Löst `seo.noindex` gegen die Felddefinition auf (nur Gruppen sind durchlaufbar). */
export function resolveField(fields: FieldMap, path: string): Field | null {
	const parts = path.split('.');
	let current: FieldMap = fields;
	for (let i = 0; i < parts.length; i++) {
		const f = current[parts[i]];
		if (!f) return null;
		if (i === parts.length - 1) return f;
		if (f.kind !== 'group') return null;
		current = f.fields;
	}
	return null;
}

/** Alle filterbaren Feldpfade einer Collection (für Fehlermeldungen und Doku). */
export function facetFields(fields: FieldMap, prefix = ''): string[] {
	const out: string[] = [];
	for (const [key, f] of Object.entries(fields)) {
		if (f.kind === 'group') out.push(...facetFields(f.fields, `${prefix}${key}.`));
		else if (FACET_KINDS.has(f.kind)) out.push(`${prefix}${key}`);
	}
	return out;
}

const OPS_BY_KIND: Record<string, readonly FilterOp[]> = {
	text: ['eq', 'ne', 'in', 'nin', 'contains'],
	number: ['eq', 'ne', 'in', 'nin', 'lt', 'lte', 'gt', 'gte'],
	date: ['eq', 'ne', 'in', 'nin', 'lt', 'lte', 'gt', 'gte'],
	boolean: ['eq', 'ne'],
	select: ['eq', 'ne', 'in', 'nin'],
	reference: ['eq', 'ne', 'in', 'nin'],
	multiselect: ['eq', 'ne', 'in', 'nin'],
	references: ['eq', 'ne', 'in', 'nin']
};

function coerceScalar(
	field: Field,
	raw: unknown,
	path: string,
	issues: ValidationIssue[]
): string | number | null {
	const s = typeof raw === 'string' ? raw.trim() : raw;
	switch (field.kind) {
		case 'number': {
			const n = typeof s === 'number' ? s : Number(s);
			if (s === '' || !Number.isFinite(n)) {
				issues.push({ path, message: 'Zahl erwartet' });
				return null;
			}
			return n;
		}
		case 'boolean': {
			if (s === true || s === 1 || s === 'true' || s === '1') return 1;
			if (s === false || s === 0 || s === 'false' || s === '0') return 0;
			issues.push({ path, message: 'true oder false erwartet' });
			return null;
		}
		case 'date': {
			const t = typeof s === 'string' ? Date.parse(s) : NaN;
			if (Number.isNaN(t)) {
				issues.push({ path, message: 'ISO-Datum erwartet' });
				return null;
			}
			return t;
		}
		case 'select':
		case 'multiselect': {
			if (typeof s !== 'string' || !field.options.some((o) => optionValue(o) === s)) {
				issues.push({ path, message: `Ungültige Option „${String(s)}"` });
				return null;
			}
			return s;
		}
		case 'reference':
		case 'references': {
			if (typeof s !== 'string' || !isValidSlug(s)) {
				issues.push({ path, message: 'Slug erwartet' });
				return null;
			}
			return s;
		}
		default: {
			if (typeof s !== 'string' || s === '') {
				issues.push({ path, message: 'Text erwartet' });
				return null;
			}
			if (s.length > 500) {
				issues.push({ path, message: 'Maximal 500 Zeichen' });
				return null;
			}
			return s;
		}
	}
}

function buildFilter<F extends FieldMap>(
	def: CollectionDefinition<F>,
	fieldPath: string,
	op: string,
	raw: unknown,
	issues: ValidationIssue[]
): Filter | null {
	const path = `filter[${fieldPath}]`;
	const field = resolveField(def.fields, fieldPath);
	if (!field || !FACET_KINDS.has(field.kind)) {
		issues.push({
			path,
			message: `Nicht filterbar. Erlaubt: ${facetFields(def.fields).join(', ') || '—'}`
		});
		return null;
	}
	if (!(FILTER_OPS as readonly string[]).includes(op)) {
		issues.push({
			path: `${path}[${op}]`,
			message: `Unbekannter Operator. Erlaubt: ${FILTER_OPS.join(', ')}`
		});
		return null;
	}
	const allowed = OPS_BY_KIND[field.kind] ?? [];
	if (!allowed.includes(op as FilterOp)) {
		issues.push({
			path: `${path}[${op}]`,
			message: `Für ${field.kind} erlaubt: ${allowed.join(', ')}`
		});
		return null;
	}
	const mode = compareMode(field);
	if (op === 'in' || op === 'nin') {
		const list = Array.isArray(raw) ? raw : typeof raw === 'string' ? raw.split(',') : [raw];
		if (list.length === 0 || list.length > LIMITS.maxInValues) {
			issues.push({ path: `${path}[${op}]`, message: `1 bis ${LIMITS.maxInValues} Werte` });
			return null;
		}
		const values: (string | number)[] = [];
		for (const item of list) {
			const v = coerceScalar(field, item, `${path}[${op}]`, issues);
			if (v !== null) values.push(v);
		}
		return values.length === list.length
			? { field: fieldPath, op: op as FilterOp, value: values, mode }
			: null;
	}
	if (op === 'contains' && mode !== 'itext') {
		issues.push({ path: `${path}[contains]`, message: 'Nur für Textfelder' });
		return null;
	}
	const v = coerceScalar(field, raw, `${path}[${op}]`, issues);
	return v === null ? null : { field: fieldPath, op: op as FilterOp, value: v, mode };
}

function buildSort<F extends FieldMap>(
	def: CollectionDefinition<F>,
	raw: string | { field: string; direction?: 'asc' | 'desc' } | undefined,
	issues: ValidationIssue[]
): Sort {
	let field: string;
	let direction: 'asc' | 'desc';
	if (raw === undefined) {
		field = def.sortBy.field;
		direction = def.sortBy.direction;
	} else if (typeof raw === 'string') {
		direction = raw.startsWith('-') ? 'desc' : 'asc';
		field = raw.replace(/^[-+]/, '');
	} else {
		field = raw.field;
		direction = raw.direction ?? 'asc';
	}
	if ((BUILTIN_SORT as readonly string[]).includes(field)) {
		return { field, direction, kind: 'column', mode: 'text' };
	}
	const f = resolveField(def.fields, field);
	if (!f || !FACET_KINDS.has(f.kind) || MULTI_KINDS.has(f.kind)) {
		issues.push({
			path: 'sort',
			message: `Nicht sortierbar. Erlaubt: ${[
				...BUILTIN_SORT,
				...facetFields(def.fields).filter((p) => {
					const x = resolveField(def.fields, p);
					return x && !MULTI_KINDS.has(x.kind);
				})
			].join(', ')}`
		});
		return { field: 'updatedAt', direction: 'desc', kind: 'column', mode: 'text' };
	}
	return { field, direction, kind: 'facet', mode: compareMode(f) };
}

/** Prüft und normalisiert eine Abfrage aus Bibliothekscode. Wirft `QueryError`. */
export function buildListQuery<F extends FieldMap>(
	def: CollectionDefinition<F>,
	input: ListQueryInput,
	languages: string[]
): ListQuery {
	const issues: ValidationIssue[] = [];
	if (input.lang !== undefined && !languages.includes(input.lang)) {
		issues.push({ path: 'lang', message: `Unbekannte Sprache. Erlaubt: ${languages.join(', ')}` });
	}
	const status = input.status ?? 'published';
	if (status !== 'draft' && status !== 'published' && status !== 'all') {
		issues.push({ path: 'status', message: 'draft, published oder all' });
	}
	if (input.q !== undefined && (typeof input.q !== 'string' || input.q.length > LIMITS.maxQ)) {
		issues.push({ path: 'q', message: `Text bis ${LIMITS.maxQ} Zeichen` });
	}
	const limit = input.limit ?? LIMITS.defaultLimit;
	if (!Number.isInteger(limit) || limit < 1 || limit > LIMITS.maxLimit) {
		issues.push({ path: 'limit', message: `Ganzzahl 1 bis ${LIMITS.maxLimit}` });
	}
	const offset = input.offset ?? 0;
	if (!Number.isInteger(offset) || offset < 0 || offset > LIMITS.maxOffset) {
		issues.push({ path: 'offset', message: `Ganzzahl 0 bis ${LIMITS.maxOffset}` });
	}
	const filters: Filter[] = [];
	for (const f of input.filters ?? []) {
		const built = buildFilter(def, f.field, f.op ?? 'eq', f.value, issues);
		if (built) filters.push(built);
	}
	const sort = buildSort(def, input.sort, issues);
	if (issues.length) throw new QueryError(issues);
	return {
		collection: def.name,
		lang: input.lang,
		status,
		q: input.q?.trim() || undefined,
		filters,
		sort,
		limit,
		offset
	};
}

const KNOWN_PARAMS = new Set(['lang', 'status', 'q', 'limit', 'offset', 'sort']);
const FILTER_KEY = /^filter\[([a-zA-Z0-9_.-]+)\](?:\[([a-z]+)\])?$/;

/** Parst URL-Parameter strikt: unbekannte Schlüssel sind ein Fehler. */
export function parseListQuery<F extends FieldMap>(
	def: CollectionDefinition<F>,
	params: URLSearchParams,
	languages: string[]
): ListQuery {
	const issues: ValidationIssue[] = [];
	const input: ListQueryInput = { filters: [] };
	for (const [key, value] of params.entries()) {
		const m = FILTER_KEY.exec(key);
		if (m) {
			input.filters!.push({ field: m[1], op: (m[2] ?? 'eq') as FilterOp, value });
			continue;
		}
		if (!KNOWN_PARAMS.has(key)) {
			issues.push({ path: key, message: 'Unbekannter Parameter' });
			continue;
		}
		if (key === 'limit' || key === 'offset') {
			const n = /^\d+$/.test(value) ? Number(value) : NaN;
			if (Number.isNaN(n)) issues.push({ path: key, message: 'Ganzzahl erwartet' });
			else input[key] = n;
		} else if (key === 'status') {
			input.status = value as ListQueryInput['status'];
		} else if (key === 'lang') {
			input.lang = value;
		} else if (key === 'q') {
			input.q = value;
		} else {
			input.sort = value;
		}
	}
	if (issues.length) throw new QueryError(issues);
	return buildListQuery(def, input, languages);
}
