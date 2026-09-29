import type { Field, FieldMap } from './fields';

/** Eine Zeile im Facetten-Index: Feldpfad → Wert (Text und/oder Zahl). */
export interface Facet {
	field: string;
	text: string;
	num: number | null;
}

/**
 * Leitet Facetten aus den zusammengeführten Feldern eines Dokuments ab.
 * Welche Feldarten indiziert werden, definiert query.ts (FACET_KINDS) —
 * hier dieselbe Menge, damit Filter und Index nie auseinanderlaufen.
 */
export function extractFacets(fields: FieldMap, value: Record<string, unknown>, prefix = ''): Facet[] {
	const out: Facet[] = [];
	for (const [key, field] of Object.entries(fields)) {
		const v = value?.[key];
		const path = `${prefix}${key}`;
		facetsOf(field, v, path, out);
	}
	return out;
}

function facetsOf(field: Field, v: unknown, path: string, out: Facet[]) {
	switch (field.kind) {
		case 'text':
			if (typeof v === 'string' && v.trim()) out.push({ field: path, text: v.slice(0, 500), num: null });
			break;
		case 'number':
			if (typeof v === 'number' && Number.isFinite(v)) out.push({ field: path, text: String(v), num: v });
			break;
		case 'boolean':
			out.push({ field: path, text: v === true ? 'true' : 'false', num: v === true ? 1 : 0 });
			break;
		case 'date':
			if (typeof v === 'string' && v) {
				const t = Date.parse(v);
				if (!Number.isNaN(t)) out.push({ field: path, text: v, num: t });
			}
			break;
		case 'select':
		case 'reference':
			if (typeof v === 'string' && v) out.push({ field: path, text: v, num: null });
			break;
		case 'multiselect':
		case 'references':
			if (Array.isArray(v)) for (const x of v) if (typeof x === 'string' && x) out.push({ field: path, text: x, num: null });
			break;
		case 'group':
			for (const [k, f] of Object.entries(field.fields)) {
				facetsOf(f, (v as Record<string, unknown> | undefined)?.[k], `${path}.${k}`, out);
			}
			break;
		default:
			break;
	}
}
