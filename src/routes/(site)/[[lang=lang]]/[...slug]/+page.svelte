<script lang="ts">
	import { BlockRenderer } from '@medienakzent/cms/render';

	let { data } = $props();
	const seo = $derived(data.doc.fields.seo as { description?: string; noindex?: boolean } | undefined);
</script>

<svelte:head>
	{#if seo?.description}<meta name="description" content={seo.description} />{/if}
	{#if seo?.noindex}<meta name="robots" content="noindex" />{/if}
</svelte:head>

{#if data.preview && data.doc.status !== 'published'}
	<div class="bg-amber-100 px-6 py-2 text-center text-sm text-amber-900">Vorschau: Entwurf ({data.doc.lang})</div>
{/if}

{#if data.doc.blocks.length}
	<BlockRenderer blocks={data.doc.blocks} />
{:else}
	<section class="mx-auto max-w-3xl px-6 py-16"><h1 class="text-3xl font-semibold">{data.title}</h1></section>
{/if}
