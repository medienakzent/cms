<script lang="ts">
	import type { BlockProps } from '@medienakzent/cms';
	import { mediaUrl } from '@medienakzent/cms';
	import type def from './block';

	let { title, subtitle, image, layout, cta }: BlockProps<typeof def> = $props();
</script>

<section class="relative overflow-hidden py-20 {layout === 'center' ? 'text-center' : ''}">
	{#if image}
		<img
			src={mediaUrl(image, 'lg')}
			alt={image.alt}
			width={image.width ?? undefined}
			height={image.height ?? undefined}
			class="absolute inset-0 -z-10 h-full w-full object-cover opacity-30"
		/>
	{/if}
	<div class="mx-auto max-w-4xl px-6">
		<h1 class="text-4xl font-semibold tracking-tight md:text-5xl">{title}</h1>
		{#if subtitle}
			<p class="text-muted-foreground mt-4 text-lg whitespace-pre-line">{subtitle}</p>
		{/if}
		{#if cta?.href}
			<a
				href={cta.href}
				target={cta.target}
				class="bg-primary text-primary-foreground mt-8 inline-block rounded-md px-5 py-2.5 font-medium"
			>
				{cta.label || cta.href}
			</a>
		{/if}
	</div>
</section>
