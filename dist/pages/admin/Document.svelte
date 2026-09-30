<script lang="ts">
	import DocumentEditor from '../../admin/DocumentEditor.svelte';
	import type { AdminLayoutData } from '../../routes/admin/layout';
	import type { load } from '../../routes/admin/document';

	let { data }: { data: AdminLayoutData & Awaited<ReturnType<typeof load>> } = $props();
</script>

{#key `${data.collection.name}/${data.doc.slug}/${data.lang}/${data.doc.updatedAt}`}
	<DocumentEditor
		collection={data.collection}
		blockDefs={data.blockDefs}
		doc={data.doc}
		exists={data.exists}
		lang={data.lang}
		languages={data.languages}
		versions={data.versions}
		previewHref={data.previewHref}
	/>
{/key}
