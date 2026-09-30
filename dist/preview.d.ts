import type { CollectionDefinition } from './collection';
import type { FieldMap } from './fields';
import type { InferFields, RenderBlock } from './types';
/** Message types between the editor and its preview frame. */
export declare const PREVIEW_MESSAGE = "cms:preview";
export declare const PREVIEW_READY_MESSAGE = "cms:preview-ready";
export interface PreviewMessage {
    type: typeof PREVIEW_MESSAGE;
    lang: string;
    /** Collection and slug of the edited document (empty slug for a new one). */
    collection: string;
    slug: string;
    fields: Record<string, unknown>;
    blocks: RenderBlock[];
}
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
