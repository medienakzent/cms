import type { Field, FieldMap } from './fields';
import type { BlockDefinition } from './block';
import type { RenderBlock, ValidationIssue } from './types';
export declare function isEmptyValue(value: unknown): boolean;
/** Empty value set for new documents and blocks. */
export declare function emptyValues(fields: FieldMap): Record<string, unknown>;
export declare function defaultValue(field: Field): unknown;
/** Coerces a raw value (storage, API) into the shape `InferField` promises. */
export declare function normalizeField(field: Field, value: unknown): unknown;
export declare function normalizeFields(fields: FieldMap, value: unknown): Record<string, unknown>;
export interface ValidateContext {
    /** Enforce required fields (publish). */
    strict: boolean;
    blocks: Record<string, BlockDefinition>;
}
/** Validates already normalized values; collects issues (empty = ok). */
export declare function validateField(field: Field, value: unknown, path: string, context: ValidateContext, issues: ValidationIssue[]): void;
export declare function validateFields(fields: FieldMap, value: Record<string, unknown>, context: ValidateContext, issues?: ValidationIssue[], prefix?: string): ValidationIssue[];
export declare function validateBlocks(blocks: RenderBlock[], allowed: readonly string[], context: ValidateContext, issues?: ValidationIssue[], prefix?: string): ValidationIssue[];
