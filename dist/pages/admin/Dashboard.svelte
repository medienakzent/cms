<script lang="ts">
	import CmsCredit from '../../admin/CmsCredit.svelte';
	import * as Card from '@compdata/ui/card';
	import { iconFor } from '../../admin/icons';
	import { formatCount } from '../../format';
	import type { AdminLayoutData } from '../../routes/admin/layout';
	import type { load } from '../../routes/admin/dashboard';
	import { ANALYTICS_PERIODS } from '../../admin/analytics/periods';
	import AnalyticsReport from '../../admin/analytics/AnalyticsReport.svelte';

	let { data }: { data: AdminLayoutData & Awaited<ReturnType<typeof load>> } = $props();
</script>

<h1 class="mb-6 text-2xl font-semibold">Übersicht</h1>

<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
	{#each data.collections as collection (collection.name)}
		{@const Icon = iconFor(collection.icon)}
		<a href="/admin/{collection.name}" class="block">
			<Card.Root class="hover:border-primary h-full transition-colors">
				<Card.Header>
					<Card.Title class="flex items-center gap-2"
						><Icon class="text-muted-foreground size-4" /> {collection.labelPlural}</Card.Title
					>
					<Card.Description
						>{formatCount(data.counts[collection.name] ?? 0, 'Dokument', 'Dokumente')} · {collection
							.blocks.length
							? formatCount(collection.blocks.length, 'Block-Typ', 'Block-Typen')
							: 'ohne Blocks'}</Card.Description
					>
				</Card.Header>
			</Card.Root>
		</a>
	{/each}
	<a href="/admin/submissions" class="block">
		<Card.Root class="hover:border-primary h-full transition-colors">
			<Card.Header>
				<Card.Title>Einsendungen</Card.Title>
				<Card.Description
					>{formatCount(
						data.submissionCount,
						'Formular-Einsendung',
						'Formular-Einsendungen'
					)}</Card.Description
				>
			</Card.Header>
		</Card.Root>
	</a>
	<a href="/admin/media" class="block">
		<Card.Root class="hover:border-primary h-full transition-colors">
			<Card.Header>
				<Card.Title>Medien</Card.Title>
				<Card.Description>{formatCount(data.mediaCount, 'Datei', 'Dateien')}</Card.Description>
			</Card.Header>
		</Card.Root>
	</a>
</div>

<div class="mt-10">
	<AnalyticsReport
		report={data.analytics}
		enabled={data.analyticsEnabled}
		periods={ANALYTICS_PERIODS}
	/>
</div>

<CmsCredit class="mt-10" />
