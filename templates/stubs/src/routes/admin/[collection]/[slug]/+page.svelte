<script lang="ts">
	import Page from '@compdata/cms/pages/admin/Document.svelte';

	let { data } = $props();
</script>

{#key `${data.collection.name}/${data.doc.slug}/${data.lang}/${data.doc.updatedAt}`}
	<Page {data} />
{/key}
