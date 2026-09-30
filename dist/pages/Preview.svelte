<script lang="ts">
	import { onMount } from 'svelte';
	import { getCmsContext } from '../context';
	import BlockRenderer from '../render/BlockRenderer.svelte';
	import { PREVIEW_MESSAGE, PREVIEW_READY_MESSAGE, type PreviewMessage } from '../preview';

	/**
	 * Renders the unsaved state the editor posts via `postMessage` (same origin only): the
	 * collection's own preview (`src/previews/<collection>.svelte`) if the project has one,
	 * otherwise the block list.
	 */
	// svelte-ignore state_referenced_locally
	const registry = getCmsContext();
	let message = $state<PreviewMessage | null>(null);

	const CollectionPreview = $derived(message ? registry.previews[message.collection] : undefined);

	onMount(() => {
		const onMessage = (event: MessageEvent<PreviewMessage>) => {
			if (event.origin !== window.location.origin || event.data?.type !== PREVIEW_MESSAGE) return;
			message = event.data;
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
	{#if message && CollectionPreview}
		<CollectionPreview
			collection={message.collection}
			slug={message.slug}
			lang={message.lang}
			fields={message.fields}
			blocks={message.blocks}
		/>
	{:else if message?.blocks.length}
		<BlockRenderer blocks={message.blocks} />
	{:else if message}
		<p style="padding: 4rem 1rem; text-align: center; opacity: 0.6">Noch keine Blocks.</p>
	{/if}
</main>
