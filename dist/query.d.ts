/**
 * List query language, defined once for the library, the REST API and the admin.
 *
 * URL form (REST):
 *   ?lang=de&status=published&q=text&limit=20&offset=0&sort=-publishedOn
 *   &filter[category]=news                -> eq
 *   &filter[year][gte]=2024               -> operator in brackets
 *   &filter[tags][in]=a,b                 -> lists comma-separated
 *   &filter[seo.noindex]=false            -> group fields with a dot
 *
 * Everything is checked against the collection definition: unknown parameters, fields,
 * operators or mistyped values yield 400 with an issue list. Filters are AND-combined.
 */
import type { CollectionDefinition } from './collection';
import type { Field, FieldMap } from './fields';
import type { DocumentStatus, ValidationIssue } from './types';
export declare const FILTER_OPS: readonly ["eq", "ne", "in", "nin", "lt", "lte", "gt", "gte", "contains"];
export type FilterOp = (typeof FILTER_OPS)[number];
/** How the value is compared in the facet index. */
export type CompareMode = 'text' | 'itext' | 'num';
export interface Filter {
    field: string;
    op: FilterOp;
    /** Already typed: number for num, otherwise string; arrays for in/nin. */
    value: string | number | (string | number)[];
    mode: CompareMode;
}
export declare const BUILTIN_SORT: readonly ["updatedAt", "createdAt", "publishedAt", "title", "slug"];
export type BuiltinSort = (typeof BUILTIN_SORT)[number];
export interface Sort {
    field: string;
    direction: 'asc' | 'desc';
    /** `column`: document table column, `facet`: field value from the facet index */
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
/** Detects an already validated query (from `parseListQuery`/`buildListQuery`). */
export declare function isListQuery(query: ListQueryInput | ListQuery): query is ListQuery;
/** Library input form, everything optional; validated by `buildListQuery`. */
export interface ListQueryInput {
    lang?: string;
    status?: DocumentStatus | 'all';
    q?: string;
    filters?: {
        field: string;
        op?: FilterOp;
        value: unknown;
    }[];
    sort?: string | {
        field: string;
        direction?: 'asc' | 'desc';
    };
    limit?: number;
    offset?: number;
}
export declare const LIMITS: {
    maxLimit: number;
    defaultLimit: number;
    maxOffset: number;
    maxQ: number;
    maxInValues: number;
};
export declare class QueryError extends Error {
    issues: ValidationIssue[];
    constructor(issues: ValidationIssue[]);
}
export declare function compareMode(field: Field): CompareMode;
/** Resolves `seo.noindex` against the field definitions; only groups can be traversed. */
export declare function resolveField(fields: FieldMap, path: string): Field | null;
/** All filterable field paths of a collection (for error messages and docs). */
export declare function facetFields(fields: FieldMap, prefix?: string): string[];
/** Validates and normalizes a query from library code. Throws `QueryError`. */
export declare function buildListQuery<Fields extends FieldMap>(definition: CollectionDefinition<Fields>, input: ListQueryInput, languages: string[]): ListQuery;
/** Parses URL parameters strictly: unknown keys are an error. */
export declare function parseListQuery<Fields extends FieldMap>(definition: CollectionDefinition<Fields>, params: URLSearchParams, languages: string[]): ListQuery;
