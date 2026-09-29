import type { MediaRef } from './types';

/** Public URL of a media file, optionally as a variant (`thumb`, `md`, `lg`). */
export function mediaUrl(media: MediaRef | null | undefined, variant?: string): string {
	if (!media) return '';
	const src = variant && media.variants?.[variant] ? media.variants[variant] : media.src;
	return `/${src}`;
}
