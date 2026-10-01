<script lang="ts">
	/** Background trend of a key figure: a soft area over the selected period, no axes. */
	type Props = { values: number[] };

	let { values }: Props = $props();

	const WIDTH = 100;
	const HEIGHT = 40;

	const points = $derived.by(() => {
		if (values.length < 2) return '';
		const maximum = Math.max(...values);
		if (maximum <= 0) return '';
		const step = WIDTH / (values.length - 1);
		// Keep a little headroom so the line never touches the card's top edge.
		return values
			.map((value, index) => `${index * step},${HEIGHT - (value / maximum) * HEIGHT * 0.9}`)
			.join(' ');
	});
</script>

{#if points}
	<svg
		class="text-primary pointer-events-none absolute inset-x-0 bottom-0 h-3/5 w-full"
		viewBox="0 0 {WIDTH} {HEIGHT}"
		preserveAspectRatio="none"
		aria-hidden="true"
	>
		<polygon points="0,{HEIGHT} {points} {WIDTH},{HEIGHT}" fill="currentColor" opacity="0.08" />
		<polyline
			{points}
			fill="none"
			stroke="currentColor"
			stroke-width="1.5"
			stroke-opacity="0.35"
			vector-effect="non-scaling-stroke"
		/>
	</svg>
{/if}
