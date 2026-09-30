<script lang="ts">
	import * as Card from '@compdata/ui/card';
	import { formatNumber, formatPercent } from '../../format';

	type Row = { label: string; count: number; href?: string };
	type Props = {
		title: string;
		rows: Row[];
		/** Reference for the share; the sum of all rows by default. */
		total?: number;
		empty?: string;
		format?: (label: string) => string;
	};

	let { title, rows, total, empty = 'Keine Daten', format = (label) => label }: Props = $props();
	const reference = $derived(total ?? rows.reduce((sum, row) => sum + row.count, 0));
	const maximum = $derived(Math.max(1, ...rows.map((row) => row.count)));
</script>

<Card.Root class="gap-3">
	<Card.Header>
		<Card.Title class="text-base">{title}</Card.Title>
	</Card.Header>
	<Card.Content class="space-y-1">
		{#each rows as row (row.label)}
			<div class="relative flex items-center justify-between gap-3 rounded px-2 py-1 text-sm">
				<div
					class="bg-primary/10 absolute inset-y-0 left-0 rounded"
					style="width: {(row.count / maximum) * 100}%"
				></div>
				{#if row.href}
					<a href={row.href} class="relative min-w-0 truncate hover:underline"
						>{format(row.label)}</a
					>
				{:else}
					<span class="relative min-w-0 truncate">{format(row.label)}</span>
				{/if}
				<span class="text-muted-foreground relative shrink-0 tabular-nums"
					>{formatNumber(row.count)}
					<span class="inline-block w-12 text-right">{formatPercent(row.count, reference)}</span
					></span
				>
			</div>
		{:else}
			<p class="text-muted-foreground px-2 text-sm">{empty}</p>
		{/each}
	</Card.Content>
</Card.Root>
