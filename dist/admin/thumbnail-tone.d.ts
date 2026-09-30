import type { Action } from 'svelte/action';
/**
 * Picks a backdrop with contrast to the image itself: light images (e.g. white logos on
 * transparency) sit on a dark backdrop, everything else on white. Re-evaluated on every load.
 */
export declare const contrastBackdrop: Action<HTMLImageElement>;
