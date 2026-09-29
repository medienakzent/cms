<script lang="ts">
	import { marked } from 'marked';

	/** Rendert Markdown aus einem `richtext`-Feld. Inhalte stammen von angemeldeten Redakteuren. */
	let { source, class: className = 'prose' }: { source: string; class?: string } = $props();

	const html = $derived(marked.parse(source ?? '', { async: false }) as string);
</script>

<div class={className}>{@html html}</div>
