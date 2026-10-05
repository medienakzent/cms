import type { CollectionDefinition } from './collection';
import type { FieldMap } from './fields';
import type { InferFields, RenderBlock } from './types';
/** Message types between the editor and its preview frame. */
export declare const PREVIEW_MESSAGE = "cms:preview";
export declare const PREVIEW_READY_MESSAGE = "cms:preview-ready";
/** Interactions in the preview frame (select, type, pick media, block actions) sent to the editor. */
export declare const PREVIEW_EVENT = "cms:preview-event";
export interface PreviewMessage {
    type: typeof PREVIEW_MESSAGE;
    lang: string;
    /** Collection and slug of the edited document (empty slug for a new one). */
    collection: string;
    slug: string;
    fields: Record<string, unknown>;
    blocks: RenderBlock[];
    /** Blocks can be selected and edited directly in the frame. */
    editable?: boolean;
    /** Block highlighted in the frame (selected in the editor). */
    selectedBlockId?: string | null;
}
export type PreviewBlockAction = 'move-up' | 'move-down' | 'duplicate' | 'remove';
export type PreviewEvent = {
    type: typeof PREVIEW_EVENT;
    action: 'select';
    blockId: string;
    field?: string;
} | {
    type: typeof PREVIEW_EVENT;
    action: 'input';
    blockId: string;
    field: string;
    value: string;
} | {
    type: typeof PREVIEW_EVENT;
    action: 'media';
    blockId: string;
    field: string;
} | {
    type: typeof PREVIEW_EVENT;
    action: PreviewBlockAction;
    blockId: string;
};
/**
 * Props of a collection preview (`src/previews/<collection>.svelte`):
 * `let { fields, blocks }: PreviewProps<typeof artists> = $props();`
 * `fields` is the UNSAVED editor state of one language — values may still be empty or incomplete.
 */
export type PreviewProps<Collection = unknown> = {
    collection: string;
    slug: string;
    lang: string;
    fields: Collection extends CollectionDefinition<infer Fields extends FieldMap> ? Partial<InferFields<Fields>> : Record<string, unknown>;
    blocks: RenderBlock[];
};
