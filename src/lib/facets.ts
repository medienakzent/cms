import type { Field, FieldMap } from './fields';

/** One row in the facet index: field path -> value (text and/or number). */
export interface Facet {
	field: string;
	text: string;
	num: number | null;
}

/**
 * Derives facets from the merged fields of a document. The indexed field kinds are
 * defined by query.ts (FACET_KINDS); the same set is used here so filters and index
 * never diverge.
 */
export function extractFacets(
	fields: FieldMap,
	value: Record<string, unknown>,
	prefix = ''
): Facet[] {
	const out: Facet[] = [];
	for (const [key, field] of Object.entries(fields)) {
		facetsOf(field, value?.[key], `${prefix}${key}`, out);
	}
	return out;
}

function facetsOf(field: Field, value: unknown, path: string, out: Facet[]) {
	switch (field.kind) {
		case 'text':
			if (typeof value === 'string' && value.trim())
				out.push({ field: path, text: value.slice(0, 500), num: null });
			break;
		case 'number':
			if (typeof value === 'number' && Number.isFinite(value))
				out.push({ field: path, text: String(value), num: value });
			break;
		case 'boolean':
			out.push({
				field: path,
				text: value === true ? 'true' : 'false',
				num: value === true ? 1 : 0
			});
			break;
		case 'date':
			if (typeof value === 'string' && value) {
				const timestamp = Date.parse(value);
				if (!Number.isNaN(timestamp)) out.push({ field: path, text: value, num: timestamp });
			}
			break;
		case 'select':
		case 'reference':
			if (typeof value === 'string' && value) out.push({ field: path, text: value, num: null });
			break;
		case 'multiselect':
		case 'references':
			if (Array.isArray(value))
				for (const entry of value)
					if (typeof entry === 'string' && entry) out.push({ field: path, text: entry, num: null });
			break;
		case 'group':
			for (const [key, groupField] of Object.entries(field.fields)) {
				facetsOf(
					groupField,
					(value as Record<string, unknown> | undefined)?.[key],
					`${path}.${key}`,
					out
				);
			}
			break;
		default:
			break;
	}
}
