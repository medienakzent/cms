<script lang="ts">
	import { getCmsContext } from '../context';
	import type { BlockComponent } from '../registry';
	import type { RenderBlock } from '../types';

	/** Renders a block list in order; components come from the registry (context) or `components`. */
	let {
		blocks,
		components
	}: { blocks: RenderBlock[]; components?: Record<string, BlockComponent> } = $props();

	// Context must be read during init; `components` is deliberately evaluated once.
	// svelte-ignore state_referenced_locally
	const registry = components ? null : getCmsContext();
	const componentMap = $derived(components ?? registry?.components ?? {});
</script>

{#each blocks as block (block.id)}
	{@const Component = componentMap[block.type]}
	{#if Component}
		<Component {...block.data} />
	{:else}
		<div class="my-4 rounded border border-dashed border-red-400 p-4 text-sm text-red-600">
			Unbekannter Block „{block.type}" — fehlt <code>src/blocks/{block.type}/</code>?
		</div>
	{/if}
{/each}
