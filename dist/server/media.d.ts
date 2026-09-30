import type { MediaItem } from '../types';
import type { Actor } from './content';
export declare function uploadMedia(file: File, actor: Actor): Promise<MediaItem>;
export declare function updateMediaAlt(id: string, alt: string): Promise<MediaItem>;
export declare function deleteMedia(id: string): Promise<void>;
export declare function reindexMedia(): Promise<number>;
export declare const media: {
    upload: typeof uploadMedia;
    updateAlt: typeof updateMediaAlt;
    remove: typeof deleteMedia;
    reindex: typeof reindexMedia;
    get(id: string): Promise<MediaItem | null>;
    list(options?: {
        kind?: string;
        q?: string;
        limit?: number;
        offset?: number;
    }): Promise<{
        items: MediaItem[];
        total: number;
    }>;
};
