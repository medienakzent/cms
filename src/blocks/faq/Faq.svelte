<script lang="ts">
	import type { BlockProps } from '@compdata/cms';
	import { Richtext } from '@compdata/cms/render';
	import type def from './block';

	let { title, items }: BlockProps<typeof def> = $props();
</script>

<section class="mx-auto max-w-3xl px-6 py-10">
	{#if title}<h2 class="mb-6 text-2xl font-semibold">{title}</h2>{/if}
	<div class="divide-border divide-y">
		{#each items as item, i (i)}
			<details class="group py-3">
				<summary class="cursor-pointer font-medium">{item.question}</summary>
				<div class="pt-2"><Richtext source={item.answer} /></div>
			</details>
		{/each}
	</div>
</section>
