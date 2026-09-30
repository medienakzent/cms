/**
 * Splits content into base file + language overlay on save and merges it back on read.
 * See fields.ts for the `localized` rule.
 */
import type { FieldMap } from './fields';
import type { BlockDefinition } from './block';
import type { RenderBlock, StoredBlock } from './types';
export { isEmptyValue, emptyValues } from './validate';
/** Splits a field value set into the non-localized base part and the localized part. */
export declare function splitFields(fields: FieldMap, value: Record<string, unknown>): {
    base: Record<string, unknown>;
    local: Record<string, unknown>;
};
/**
 * Merges base + overlay (+ fallback overlay of the default language) and normalizes
 * every value to the type the component expects.
 */
export declare function mergeFields(fields: FieldMap, base: Record<string, unknown> | undefined, local: Record<string, unknown> | undefined, fallback: Record<string, unknown> | undefined): Record<string, unknown>;
export declare function splitBlocks(definitions: Record<string, BlockDefinition>, blocks: RenderBlock[]): {
    base: StoredBlock[];
    local: Record<string, Record<string, unknown>>;
};
export declare function mergeBlocks(definitions: Record<string, BlockDefinition>, stored: StoredBlock[], local: Record<string, Record<string, unknown>> | undefined, fallback: Record<string, Record<string, unknown>> | undefined): RenderBlock[];
