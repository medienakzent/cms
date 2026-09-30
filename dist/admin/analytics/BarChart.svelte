<script lang="ts">
	type Bar = { label: string; value: number; secondary?: number; title: string };
	type Props = {
		bars: Bar[];
		/** Labels below the chart, e.g. first, middle and last day. */
		axis: string[];
		height?: string;
	};

	let { bars, axis, height = 'h-40' }: Props = $props();
	const maximum = $derived(Math.max(1, ...bars.map((bar) => bar.value)));
</script>

<div class="flex {height} items-end gap-px" role="img" aria-label="Verlauf">
	{#each bars as bar (bar.label)}
		<div class="group relative flex h-full flex-1 items-end" title={bar.title}>
			<div
				class="bg-primary/25 group-hover:bg-primary/40 relative w-full rounded-t-sm transition-colors"
				style="height: {(bar.value / maximum) * 100}%"
			>
				{#if bar.secondary}
					<div
						class="bg-primary absolute inset-x-0 bottom-0 rounded-t-sm"
						style="height: {(bar.secondary / Math.max(bar.value, 1)) * 100}%"
					></div>
				{/if}
			</div>
		</div>
	{/each}
</div>
<div class="text-muted-foreground mt-1 flex justify-between text-xs">
	{#each axis as label, position (position)}
		<span>{label}</span>
	{/each}
</div>
