<script lang="ts">
	import type { BlockProps } from '@medienakzent/cms';
	import { mediaUrl } from '@medienakzent/cms';
	import type def from './block';

	let { image, caption, size }: BlockProps<typeof def> = $props();
</script>

{#if image}
	<figure class="mx-auto py-8 {size === 'full' ? 'max-w-none' : 'max-w-4xl px-6'}">
		<img
			src={mediaUrl(image, size === 'full' ? 'lg' : 'md')}
			alt={image.alt}
			width={image.width ?? undefined}
			height={image.height ?? undefined}
			class="w-full {size === 'full' ? '' : 'rounded-lg'}"
			loading="lazy"
		/>
		{#if caption}
			<figcaption class="text-muted-foreground mt-2 text-center text-sm">{caption}</figcaption>
		{/if}
	</figure>
{/if}
