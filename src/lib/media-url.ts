import type { MediaRef } from './types';

/** Öffentliche URL einer Mediendatei, optional als Variante (`thumb`, `md`, `lg`). */
export function mediaUrl(ref: MediaRef | null | undefined, variant?: string): string {
	if (!ref) return '';
	const src = variant && ref.variants?.[variant] ? ref.variants[variant] : ref.src;
	return `/${src}`;
}
