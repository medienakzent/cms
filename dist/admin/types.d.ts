import type { FieldMap } from '../fields';
/** Serializable view of the definitions for the client (no functions). */
export interface AdminCollection {
    name: string;
    label: string;
    labelPlural: string;
    icon?: string;
    titleField: string;
    fields: FieldMap;
    blocks: string[];
}
export interface AdminBlock {
    name: string;
    label: string;
    description?: string;
    icon?: string;
    version: number;
    fields: FieldMap;
}
