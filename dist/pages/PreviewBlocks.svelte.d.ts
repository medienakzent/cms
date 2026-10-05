import type { RenderBlock } from '../types';
/**
 * Block list of the preview frame with direct editing. Customer blocks need no changes: text
 * and textarea fields are found by their rendered text, media fields by their file URL. Those
 * elements become editable (typing) or clickable (media picker); a click elsewhere selects the
 * block, whose full form the editor then opens. The editor's state stays the only truth.
 */
type Props = {
    blocks: RenderBlock[];
    selectedBlockId: string | null;
    /** True while an element is being typed into; the frame then holds back incoming state. */
    editing: boolean;
};
declare const PreviewBlocks: import("svelte").Component<Props, {}, "editing">;
type PreviewBlocks = ReturnType<typeof PreviewBlocks>;
export default PreviewBlocks;
