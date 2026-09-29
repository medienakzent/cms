/**
 * Splits content into base file + language overlay on save and merges it back on read.
 * See fields.ts for the `localized` rule.
 */
import type { Field, FieldMap } from './fields';
import type { BlockDefinition } from './block';
import { migrateBlockData } from './block';
import type { RenderBlock, StoredBlock } from './types';
import { isEmptyValue, normalizeField, normalizeFields } from './validate';

export { isEmptyValue, emptyValues } from './validate';

function hasLocalizedLeaf(field: Field): boolean {
	if (field.localized) return true;
	if (field.kind === 'group') return Object.values(field.fields).some(hasLocalizedLeaf);
	return false;
}

/** Splits a field value set into the non-localized base part and the localized part. */
export function splitFields(
	fields: FieldMap,
	value: Record<string, unknown>
): { base: Record<string, unknown>; local: Record<string, unknown> } {
	const base: Record<string, unknown> = {};
	const local: Record<string, unknown> = {};
	for (const [key, field] of Object.entries(fields)) {
		const fieldValue = value?.[key];
		if (field.localized) {
			local[key] = fieldValue;
		} else if (field.kind === 'group' && hasLocalizedLeaf(field)) {
			const inner = splitFields(field.fields, (fieldValue as Record<string, unknown>) ?? {});
			base[key] = inner.base;
			local[key] = inner.local;
		} else {
			base[key] = fieldValue;
		}
	}
	return { base, local };
}

/**
 * Merges base + overlay (+ fallback overlay of the default language) and normalizes
 * every value to the type the component expects.
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
			let value = local?.[key];
			if (isEmptyValue(value) && fallback) value = fallback[key];
			out[key] = normalizeField(field, value);
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
	definitions: Record<string, BlockDefinition>,
	blocks: RenderBlock[]
): { base: StoredBlock[]; local: Record<string, Record<string, unknown>> } {
	const base: StoredBlock[] = [];
	const local: Record<string, Record<string, unknown>> = {};
	for (const block of blocks) {
		const definition = definitions[block.type];
		if (!definition) {
			// Unknown type goes into the base unchanged; validation reports it.
			base.push({ id: block.id, type: block.type, version: 0, data: block.data });
			continue;
		}
		const parts = splitFields(definition.fields, block.data);
		base.push({ id: block.id, type: block.type, version: definition.version, data: parts.base });
		if (Object.keys(parts.local).length) local[block.id] = parts.local;
	}
	return { base, local };
}

export function mergeBlocks(
	definitions: Record<string, BlockDefinition>,
	stored: StoredBlock[],
	local: Record<string, Record<string, unknown>> | undefined,
	fallback: Record<string, Record<string, unknown>> | undefined
): RenderBlock[] {
	return stored.map((block) => {
		const definition = definitions[block.type];
		if (!definition) return { id: block.id, type: block.type, data: block.data };
		let data = mergeFields(definition.fields, block.data, local?.[block.id], fallback?.[block.id]);
		if (block.version < definition.version) {
			data = migrateBlockData(definition, block.version, data).data;
			data = normalizeFields(definition.fields, data);
		}
		return { id: block.id, type: block.type, data };
	});
}
