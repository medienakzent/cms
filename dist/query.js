import { optionValue } from './fields';
import { isValidSlug } from './slug';
export const FILTER_OPS = ['eq', 'ne', 'in', 'nin', 'lt', 'lte', 'gt', 'gte', 'contains'];
export const BUILTIN_SORT = ['updatedAt', 'createdAt', 'publishedAt', 'title', 'slug'];
/** Detects an already validated query (from `parseListQuery`/`buildListQuery`). */
export function isListQuery(query) {
    return ('collection' in query &&
        typeof query.sort === 'object' &&
        query.sort !== null &&
        'kind' in query.sort);
}
export const LIMITS = {
    maxLimit: 200,
    defaultLimit: 50,
    maxOffset: 100_000,
    maxQ: 200,
    maxInValues: 50
};
export class QueryError extends Error {
    issues;
    constructor(issues) {
        super('Ungültige Abfrage');
        this.name = 'QueryError';
        this.issues = issues;
    }
}
// ── Fields ──────────────────────────────────────────────────────────────────
/** Field kinds that land in the facet index and are therefore filterable and sortable. */
const FACET_KINDS = new Set([
    'text',
    'number',
    'boolean',
    'date',
    'select',
    'multiselect',
    'reference',
    'references'
]);
const MULTI_KINDS = new Set(['multiselect', 'references']);
export function compareMode(field) {
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
/** Resolves `seo.noindex` against the field definitions; only groups can be traversed. */
export function resolveField(fields, path) {
    const parts = path.split('.');
    let current = fields;
    for (let index = 0; index < parts.length; index++) {
        const field = current[parts[index]];
        if (!field)
            return null;
        if (index === parts.length - 1)
            return field;
        if (field.kind !== 'group')
            return null;
        current = field.fields;
    }
    return null;
}
/** All filterable field paths of a collection (for error messages and docs). */
export function facetFields(fields, prefix = '') {
    const out = [];
    for (const [key, field] of Object.entries(fields)) {
        if (field.kind === 'group')
            out.push(...facetFields(field.fields, `${prefix}${key}.`));
        else if (FACET_KINDS.has(field.kind))
            out.push(`${prefix}${key}`);
    }
    return out;
}
const OPS_BY_KIND = {
    text: ['eq', 'ne', 'in', 'nin', 'contains'],
    number: ['eq', 'ne', 'in', 'nin', 'lt', 'lte', 'gt', 'gte'],
    date: ['eq', 'ne', 'in', 'nin', 'lt', 'lte', 'gt', 'gte'],
    boolean: ['eq', 'ne'],
    select: ['eq', 'ne', 'in', 'nin'],
    reference: ['eq', 'ne', 'in', 'nin'],
    multiselect: ['eq', 'ne', 'in', 'nin'],
    references: ['eq', 'ne', 'in', 'nin']
};
function coerceScalar(field, raw, path, issues) {
    const value = typeof raw === 'string' ? raw.trim() : raw;
    switch (field.kind) {
        case 'number': {
            const number = typeof value === 'number' ? value : Number(value);
            if (value === '' || !Number.isFinite(number)) {
                issues.push({ path, message: 'Zahl erwartet' });
                return null;
            }
            return number;
        }
        case 'boolean': {
            if (value === true || value === 1 || value === 'true' || value === '1')
                return 1;
            if (value === false || value === 0 || value === 'false' || value === '0')
                return 0;
            issues.push({ path, message: 'true oder false erwartet' });
            return null;
        }
        case 'date': {
            const timestamp = typeof value === 'string' ? Date.parse(value) : NaN;
            if (Number.isNaN(timestamp)) {
                issues.push({ path, message: 'ISO-Datum erwartet' });
                return null;
            }
            return timestamp;
        }
        case 'select':
        case 'multiselect': {
            if (typeof value !== 'string' ||
                !field.options.some((option) => optionValue(option) === value)) {
                issues.push({ path, message: `Ungültige Option „${String(value)}"` });
                return null;
            }
            return value;
        }
        case 'reference':
        case 'references': {
            if (typeof value !== 'string' || !isValidSlug(value)) {
                issues.push({ path, message: 'Slug erwartet' });
                return null;
            }
            return value;
        }
        default: {
            if (typeof value !== 'string' || value === '') {
                issues.push({ path, message: 'Text erwartet' });
                return null;
            }
            if (value.length > 500) {
                issues.push({ path, message: 'Maximal 500 Zeichen' });
                return null;
            }
            return value;
        }
    }
}
function buildFilter(definition, fieldPath, operator, raw, issues) {
    const path = `filter[${fieldPath}]`;
    const field = resolveField(definition.fields, fieldPath);
    if (!field || !FACET_KINDS.has(field.kind)) {
        issues.push({
            path,
            message: `Nicht filterbar. Erlaubt: ${facetFields(definition.fields).join(', ') || '—'}`
        });
        return null;
    }
    if (!FILTER_OPS.includes(operator)) {
        issues.push({
            path: `${path}[${operator}]`,
            message: `Unbekannter Operator. Erlaubt: ${FILTER_OPS.join(', ')}`
        });
        return null;
    }
    const allowed = OPS_BY_KIND[field.kind] ?? [];
    if (!allowed.includes(operator)) {
        issues.push({
            path: `${path}[${operator}]`,
            message: `Für ${field.kind} erlaubt: ${allowed.join(', ')}`
        });
        return null;
    }
    const mode = compareMode(field);
    if (operator === 'in' || operator === 'nin') {
        const list = Array.isArray(raw) ? raw : typeof raw === 'string' ? raw.split(',') : [raw];
        if (list.length === 0 || list.length > LIMITS.maxInValues) {
            issues.push({ path: `${path}[${operator}]`, message: `1 bis ${LIMITS.maxInValues} Werte` });
            return null;
        }
        const values = [];
        for (const item of list) {
            const value = coerceScalar(field, item, `${path}[${operator}]`, issues);
            if (value !== null)
                values.push(value);
        }
        return values.length === list.length
            ? { field: fieldPath, op: operator, value: values, mode }
            : null;
    }
    if (operator === 'contains' && mode !== 'itext') {
        issues.push({ path: `${path}[contains]`, message: 'Nur für Textfelder' });
        return null;
    }
    const value = coerceScalar(field, raw, `${path}[${operator}]`, issues);
    return value === null ? null : { field: fieldPath, op: operator, value, mode };
}
function buildSort(definition, raw, issues) {
    let field;
    let direction;
    if (raw === undefined) {
        field = definition.sortBy.field;
        direction = definition.sortBy.direction;
    }
    else if (typeof raw === 'string') {
        direction = raw.startsWith('-') ? 'desc' : 'asc';
        field = raw.replace(/^[-+]/, '');
    }
    else {
        field = raw.field;
        direction = raw.direction ?? 'asc';
    }
    if (BUILTIN_SORT.includes(field)) {
        return { field, direction, kind: 'column', mode: 'text' };
    }
    const sortField = resolveField(definition.fields, field);
    if (!sortField || !FACET_KINDS.has(sortField.kind) || MULTI_KINDS.has(sortField.kind)) {
        issues.push({
            path: 'sort',
            message: `Nicht sortierbar. Erlaubt: ${[
                ...BUILTIN_SORT,
                ...facetFields(definition.fields).filter((path) => {
                    const resolved = resolveField(definition.fields, path);
                    return resolved && !MULTI_KINDS.has(resolved.kind);
                })
            ].join(', ')}`
        });
        return { field: 'updatedAt', direction: 'desc', kind: 'column', mode: 'text' };
    }
    return { field, direction, kind: 'facet', mode: compareMode(sortField) };
}
/** Validates and normalizes a query from library code. Throws `QueryError`. */
export function buildListQuery(definition, input, languages) {
    const issues = [];
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
    const filters = [];
    for (const filter of input.filters ?? []) {
        const built = buildFilter(definition, filter.field, filter.op ?? 'eq', filter.value, issues);
        if (built)
            filters.push(built);
    }
    const sort = buildSort(definition, input.sort, issues);
    if (issues.length)
        throw new QueryError(issues);
    return {
        collection: definition.name,
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
/** Parses URL parameters strictly: unknown keys are an error. */
export function parseListQuery(definition, params, languages) {
    const issues = [];
    const input = { filters: [] };
    for (const [key, value] of params.entries()) {
        const match = FILTER_KEY.exec(key);
        if (match) {
            input.filters.push({ field: match[1], op: (match[2] ?? 'eq'), value });
            continue;
        }
        if (!KNOWN_PARAMS.has(key)) {
            issues.push({ path: key, message: 'Unbekannter Parameter' });
            continue;
        }
        if (key === 'limit' || key === 'offset') {
            const number = /^\d+$/.test(value) ? Number(value) : NaN;
            if (Number.isNaN(number))
                issues.push({ path: key, message: 'Ganzzahl erwartet' });
            else
                input[key] = number;
        }
        else if (key === 'status') {
            input.status = value;
        }
        else if (key === 'lang') {
            input.lang = value;
        }
        else if (key === 'q') {
            input.q = value;
        }
        else {
            input.sort = value;
        }
    }
    if (issues.length)
        throw new QueryError(issues);
    return buildListQuery(definition, input, languages);
}
