import type { BlockComponent } from '../registry';
import type { RenderBlock } from '../types';
type $$ComponentProps = {
    blocks: RenderBlock[];
    components?: Record<string, BlockComponent>;
};
declare const BlockRenderer: import("svelte").Component<$$ComponentProps, {}, "">;
type BlockRenderer = ReturnType<typeof BlockRenderer>;
export default BlockRenderer;
