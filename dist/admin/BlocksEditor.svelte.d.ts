import type { RenderBlock } from '../types';
import type { AdminBlock } from './types';
type Props = {
    blocks: RenderBlock[];
    allowed: string[];
    blockDefs: Record<string, AdminBlock>;
    lang: string;
    errors: Record<string, string>;
    /** Path prefix (`blocks` at the root). */
    path?: string;
    onchange: (blocks: RenderBlock[]) => void;
    /** Expanded block ids, all collapsed by default. Bindable so the editor can expand/collapse all. */
    expanded?: Set<string>;
};
declare const BlocksEditor: import("svelte").Component<Props, {}, "expanded">;
type BlocksEditor = ReturnType<typeof BlocksEditor>;
export default BlocksEditor;
