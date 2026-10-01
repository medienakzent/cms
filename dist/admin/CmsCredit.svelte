<script lang="ts">
	import { CMS_NAME, CMS_URL } from './brand';

	type Props = { prefix?: string; class?: string };

	let { prefix = '', class: className = '' }: Props = $props();
</script>

<p class="text-muted-foreground text-center text-xs {className}">
	{#if prefix}{`${prefix} · `}{/if}<a
		href={CMS_URL}
		target="_blank"
		rel="noopener"
		class="hover:text-foreground underline-offset-2 hover:underline">{CMS_NAME}</a
	>
</p>
