<script lang="ts">
	import type { BlockProps } from '@compdata/cms';
	import type def from './block';

	let { title, text, link, tone }: BlockProps<typeof def> = $props();
</script>

<section class="px-6 py-12 {tone === 'primary' ? 'bg-primary text-primary-foreground' : 'bg-muted'}">
	<div class="mx-auto flex max-w-4xl flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
		<div>
			<h2 class="text-2xl font-semibold">{title}</h2>
			{#if text}<p class="mt-1 opacity-90">{text}</p>{/if}
		</div>
		{#if link}
			<a
				href={link.href}
				target={link.target}
				class="rounded-md border border-current px-5 py-2.5 font-medium whitespace-nowrap"
			>
				{link.label || link.href}
			</a>
		{/if}
	</div>
</section>
