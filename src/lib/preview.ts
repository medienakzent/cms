import type { RenderBlock } from './types';

/** Message types between the editor and its preview frame. */
export const PREVIEW_MESSAGE = 'cms:preview';
export const PREVIEW_READY_MESSAGE = 'cms:preview-ready';

export interface PreviewMessage {
	type: typeof PREVIEW_MESSAGE;
	lang: string;
	fields: Record<string, unknown>;
	blocks: RenderBlock[];
}
