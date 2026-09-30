/**
 * Index repository: derived data for lists, filters, search and references.
 * Everything here can be rebuilt from the storage via `cms.reindex()`.
 * On schema changes bump INDEX_SCHEMA_VERSION; the tables are then dropped
 * and recreated at startup.
 */
import type { Facet } from '../../facets';
import type { ListQuery } from '../../query';
import type { IndexRow, MediaItem } from '../../types';
import type { DbDriver } from '../db/driver';
export declare const INDEX_SCHEMA_VERSION = 2;
export type IndexDocument = IndexRow & {
    search: string;
    facets: Facet[];
};
export declare function createIndexRepo(db: DbDriver): {
    /** Creates the tables; `reset: true` means the document index must be rebuilt. */
    ensureSchema(): Promise<{
        reset: boolean;
    }>;
    upsertDocument(rows: IndexDocument[]): Promise<void>;
    removeDocument(collection: string, slug: string, lang?: string): Promise<void>;
    /** Removes languages that no longer exist in the storage. */
    pruneLangs(collection: string, slug: string, keep: string[]): Promise<void>;
    clearDocuments(): Promise<void>;
    list(query: ListQuery): Promise<{
        items: IndexRow[];
        total: number;
    }>;
    countByCollection(): Promise<Record<string, number>>;
    insertMedia(mediaItem: MediaItem): Promise<void>;
    updateMediaAlt(id: string, alt: string): Promise<void>;
    getMedia(id: string): Promise<MediaItem | null>;
    listMedia(options?: {
        kind?: string;
        q?: string;
        limit?: number;
        offset?: number;
    }): Promise<{
        items: MediaItem[];
        total: number;
    }>;
    removeMedia(id: string): Promise<void>;
    clearMedia(): Promise<void>;
};
export type IndexRepo = ReturnType<typeof createIndexRepo>;
