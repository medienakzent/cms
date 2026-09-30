import type { FieldMap } from './fields';
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
export declare function extractFacets(fields: FieldMap, value: Record<string, unknown>, prefix?: string): Facet[];
