<script lang="ts">
	import type { BlockProps } from '@compdata/cms';
	import { mediaUrl } from '@compdata/cms';
	import type def from './block';

	let { title, items, columns }: BlockProps<typeof def> = $props();
</script>

<section class="mx-auto max-w-6xl px-6 py-10">
	{#if title}<h2 class="mb-6 text-2xl font-semibold">{title}</h2>{/if}
	<div class="grid gap-4" style="grid-template-columns: repeat({columns ?? 3}, minmax(0, 1fr))">
		{#each items as item, i (i)}
			{#if item.image}
				<figure>
					<img
						src={mediaUrl(item.image, 'md')}
						alt={item.image.alt}
						class="aspect-[4/3] w-full rounded-md object-cover"
						loading="lazy"
					/>
					{#if item.caption}<figcaption class="text-muted-foreground mt-1 text-sm">{item.caption}</figcaption>{/if}
				</figure>
			{/if}
		{/each}
	</div>
</section>
