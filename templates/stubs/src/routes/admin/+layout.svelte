<script lang="ts">
	import '../../admin.css';
	import Layout from '@compdata/cms/pages/admin/Layout.svelte';
	import registry from '../../cms';

	let { data, children } = $props();
</script>

<Layout {data} {registry} {children} />
