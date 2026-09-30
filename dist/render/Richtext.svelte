<script lang="ts">
	import { renderMarkdown } from '../markdown';

	let { source, class: className = 'prose' }: { source: string; class?: string } = $props();

	const html = $derived(renderMarkdown(source ?? ''));
</script>

<div class={className}>{@html html}</div>
