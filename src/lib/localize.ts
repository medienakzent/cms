/**
 * Aufteilen (Speichern) und Zusammenführen (Lesen) von Inhalten in
 * Basis-Datei + Sprach-Overlay. Siehe fields.ts für die Regel zu `localized`.
 */
import type { Field, FieldMap } from './fields';
import type { BlockDefinition } from './block';
import { migrateBlockData } from './block';
import type { RenderBlock, StoredBlock } from './types';
import { defaultValue, normalizeField, normalizeFields } from './validate';

export function isEmptyValue(v: unknown): boolean {
	if (v === undefined || v === null) return true;
	if (typeof v === 'string') return v.trim() === '';
	if (Array.isArray(v)) return v.length === 0;
	return false;
}

function hasLocalizedLeaf(field: Field): boolean {
	if (field.localized) return true;
	if (field.kind === 'group') return Object.values(field.fields).some(hasLocalizedLeaf);
	return false;
}

/** Trennt einen Feldwert-Satz in nicht-lokalisierten Basisanteil und lokalisierten Anteil. */
export function splitFields(
	fields: FieldMap,
	value: Record<string, unknown>
): { base: Record<string, unknown>; local: Record<string, unknown> } {
	const base: Record<string, unknown> = {};
	const local: Record<string, unknown> = {};
	for (const [key, field] of Object.entries(fields)) {
		const v = value?.[key];
		if (field.localized) {
			local[key] = v;
		} else if (field.kind === 'group' && hasLocalizedLeaf(field)) {
			const inner = splitFields(field.fields, (v as Record<string, unknown>) ?? {});
			base[key] = inner.base;
			local[key] = inner.local;
		} else {
			base[key] = v;
		}
	}
	return { base, local };
}

/**
 * Führt Basis + Overlay (+ Fallback-Overlay der Standardsprache) zusammen und
 * normalisiert jeden Wert auf den Typ, den die Komponente erwartet.
 */
export function mergeFields(
	fields: FieldMap,
	base: Record<string, unknown> | undefined,
	local: Record<string, unknown> | undefined,
	fallback: Record<string, unknown> | undefined
): Record<string, unknown> {
	const out: Record<string, unknown> = {};
	for (const [key, field] of Object.entries(fields)) {
		if (field.localized) {
			let v = local?.[key];
			if (isEmptyValue(v) && fallback) v = fallback[key];
			out[key] = normalizeField(field, v);
		} else if (field.kind === 'group' && hasLocalizedLeaf(field)) {
			out[key] = mergeFields(
				field.fields,
				base?.[key] as Record<string, unknown> | undefined,
				local?.[key] as Record<string, unknown> | undefined,
				fallback?.[key] as Record<string, unknown> | undefined
			);
		} else {
			out[key] = normalizeField(field, base?.[key]);
		}
	}
	return out;
}

export function splitBlocks(
	defs: Record<string, BlockDefinition>,
	blocks: RenderBlock[]
): { base: StoredBlock[]; local: Record<string, Record<string, unknown>> } {
	const base: StoredBlock[] = [];
	const local: Record<string, Record<string, unknown>> = {};
	for (const block of blocks) {
		const def = defs[block.type];
		if (!def) {
			// Unbekannter Typ: unverändert in die Basis (Validierung meldet ihn).
			base.push({ id: block.id, type: block.type, version: 0, data: block.data });
			continue;
		}
		const parts = splitFields(def.fields, block.data);
		base.push({ id: block.id, type: block.type, version: def.version, data: parts.base });
		if (Object.keys(parts.local).length) local[block.id] = parts.local;
	}
	return { base, local };
}

export function mergeBlocks(
	defs: Record<string, BlockDefinition>,
	stored: StoredBlock[],
	local: Record<string, Record<string, unknown>> | undefined,
	fallback: Record<string, Record<string, unknown>> | undefined
): RenderBlock[] {
	return stored.map((block) => {
		const def = defs[block.type];
		if (!def) return { id: block.id, type: block.type, data: block.data };
		let data = mergeFields(def.fields, block.data, local?.[block.id], fallback?.[block.id]);
		if (block.version < def.version) {
			data = migrateBlockData(def, block.version, data).data;
			data = normalizeFields(def.fields, data);
		}
		return { id: block.id, type: block.type, data };
	});
}

/** Leerer Wert-Satz für neue Dokumente/Blocks. */
export function emptyValues(fields: FieldMap): Record<string, unknown> {
	const out: Record<string, unknown> = {};
	for (const [key, field] of Object.entries(fields)) out[key] = defaultValue(field);
	return out;
}
