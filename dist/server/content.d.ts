import type { CollectionDefinition } from '../collection';
import type { FieldMap } from '../fields';
import type { Document, DocumentInput, DocumentStatus, VersionInfo } from '../types';
import { type ListQuery, type ListQueryInput } from '../query';
export interface Actor {
    id: string;
    name: string;
}
export declare const SYSTEM_ACTOR: Actor;
export interface GetOptions {
    lang?: string;
    /** Fill missing translations field by field from the default language (default: true). */
    fallback?: boolean;
    /** `published` (default) returns only published language versions. */
    status?: DocumentStatus | 'all';
}
export declare function collection(name: string): {
    definition: CollectionDefinition<FieldMap>;
    /** List from the index; filters/sort are validated against the field definitions (CmsError 400). */
    list(input?: ListQueryInput | ListQuery): Promise<{
        items: import("..").IndexRow[];
        total: number;
    }>;
    /** Validated query from raw parameters (e.g. URLSearchParams of the API). */
    query: (input: ListQueryInput) => ListQuery;
    get(slug: string, options?: GetOptions): Promise<Document | null>;
    /** For the editor: no fallback, any status; a missing language is an empty translation. */
    getEditable(slug: string, lang: string): Promise<{
        exists: boolean;
        doc: Document<FieldMap>;
    } | null>;
    exists(slug: string): Promise<boolean>;
    create(options: {
        slug: string;
        lang?: string;
        input?: Partial<DocumentInput>;
        status?: DocumentStatus;
        actor: Actor;
    }): Promise<Document>;
    /** Saves one language version; non-localized fields and block structure are shared (base file). */
    save(slug: string, lang: string, input: DocumentInput, options: {
        actor: Actor;
        status?: DocumentStatus;
    }): Promise<Document>;
    setStatus(slug: string, lang: string, status: DocumentStatus, actor: Actor): Promise<Document>;
    /** Removes one language version or (without `lang`) the whole document; history is kept. */
    remove(slug: string, options: {
        lang?: string;
        actor: Actor;
    }): Promise<void>;
    versions(slug: string): Promise<VersionInfo[]>;
    /** Restores a version; the current state is archived first. */
    restore(slug: string, versionId: string, actor: Actor): Promise<void>;
    /** All slugs of this collection straight from the storage (no index). */
    slugs(): Promise<string[]>;
};
export type CollectionApi = ReturnType<typeof collection>;
/** Rebuilds the whole index from the storage. */
export declare function reindexContent(): Promise<{
    documents: number;
    languages: number;
}>;
