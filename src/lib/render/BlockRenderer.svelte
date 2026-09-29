<script lang="ts">
	import { getCmsContext } from '../context';
	import type { BlockComponent } from '../registry';
	import type { RenderBlock } from '../types';

	/**
	 * Der immer gleiche Wrapper: rendert eine Block-Liste in Reihenfolge.
	 * Komponenten kommen aus der Registry (Kontext) oder explizit über `components`.
	 */
	let { blocks, components }: { blocks: RenderBlock[]; components?: Record<string, BlockComponent> } = $props();

	// Kontext muss bei der Initialisierung gelesen werden; `components` als Prop ist eine bewusste Einmal-Entscheidung.
	// svelte-ignore state_referenced_locally
	const registry = components ? null : getCmsContext();
	const map = $derived(components ?? registry?.components ?? {});
</script>

{#each blocks as block (block.id)}
	{@const Component = map[block.type]}
	{#if Component}
		<Component {...block.data} />
	{:else}
		<div class="my-4 rounded border border-dashed border-red-400 p-4 text-sm text-red-600">
			Unbekannter Block „{block.type}" — fehlt <code>src/blocks/{block.type}/</code>?
		</div>
	{/if}
{/each}
