<script lang="ts">
	import { onMount } from 'svelte';
	import BlockRenderer from '../render/BlockRenderer.svelte';
	import { PREVIEW_MESSAGE, PREVIEW_READY_MESSAGE, type PreviewMessage } from '../preview';
	import type { RenderBlock } from '../types';

	/** Renders the unsaved block list the editor posts via `postMessage` (same origin only). */
	let blocks = $state<RenderBlock[]>([]);
	let received = $state(false);

	onMount(() => {
		const onMessage = (event: MessageEvent<PreviewMessage>) => {
			if (event.origin !== window.location.origin || event.data?.type !== PREVIEW_MESSAGE) return;
			blocks = event.data.blocks;
			received = true;
		};
		window.addEventListener('message', onMessage);
		window.parent?.postMessage({ type: PREVIEW_READY_MESSAGE }, window.location.origin);
		return () => window.removeEventListener('message', onMessage);
	});
</script>

<svelte:head>
	<title>Vorschau</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<main id="inhalt" data-cms-preview>
	{#if blocks.length}
		<BlockRenderer {blocks} />
	{:else if received}
		<p style="padding: 4rem 1rem; text-align: center; opacity: 0.6">Noch keine Blocks.</p>
	{/if}
</main>
