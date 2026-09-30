import { migrateBlockData } from './block';
import { isEmptyValue, normalizeField, normalizeFields } from './validate';
export { isEmptyValue, emptyValues } from './validate';
function hasLocalizedLeaf(field) {
    if (field.localized)
        return true;
    if (field.kind === 'group')
        return Object.values(field.fields).some(hasLocalizedLeaf);
    return false;
}
/** Splits a field value set into the non-localized base part and the localized part. */
export function splitFields(fields, value) {
    const base = {};
    const local = {};
    for (const [key, field] of Object.entries(fields)) {
        const fieldValue = value?.[key];
        if (field.localized) {
            local[key] = fieldValue;
        }
        else if (field.kind === 'group' && hasLocalizedLeaf(field)) {
            const inner = splitFields(field.fields, fieldValue ?? {});
            base[key] = inner.base;
            local[key] = inner.local;
        }
        else {
            base[key] = fieldValue;
        }
    }
    return { base, local };
}
/**
 * Merges base + overlay (+ fallback overlay of the default language) and normalizes
 * every value to the type the component expects.
 */
export function mergeFields(fields, base, local, fallback) {
    const out = {};
    for (const [key, field] of Object.entries(fields)) {
        if (field.localized) {
            let value = local?.[key];
            if (isEmptyValue(value) && fallback)
                value = fallback[key];
            out[key] = normalizeField(field, value);
        }
        else if (field.kind === 'group' && hasLocalizedLeaf(field)) {
            out[key] = mergeFields(field.fields, base?.[key], local?.[key], fallback?.[key]);
        }
        else {
            out[key] = normalizeField(field, base?.[key]);
        }
    }
    return out;
}
export function splitBlocks(definitions, blocks) {
    const base = [];
    const local = {};
    for (const block of blocks) {
        const definition = definitions[block.type];
        if (!definition) {
            // Unknown type goes into the base unchanged; validation reports it.
            base.push({ id: block.id, type: block.type, version: 0, data: block.data });
            continue;
        }
        const parts = splitFields(definition.fields, block.data);
        base.push({ id: block.id, type: block.type, version: definition.version, data: parts.base });
        if (Object.keys(parts.local).length)
            local[block.id] = parts.local;
    }
    return { base, local };
}
export function mergeBlocks(definitions, stored, local, fallback) {
    return stored.map((block) => {
        const definition = definitions[block.type];
        if (!definition)
            return { id: block.id, type: block.type, data: block.data };
        let data = mergeFields(definition.fields, block.data, local?.[block.id], fallback?.[block.id]);
        if (block.version < definition.version) {
            data = migrateBlockData(definition, block.version, data).data;
            data = normalizeFields(definition.fields, data);
        }
        return { id: block.id, type: block.type, data };
    });
}
