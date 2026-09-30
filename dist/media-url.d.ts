import type { MediaRef } from './types';
/** Public URL of a media file, optionally as a variant (`thumb`, `md`, `lg`). */
export declare function mediaUrl(media: MediaRef | null | undefined, variant?: string): string;
