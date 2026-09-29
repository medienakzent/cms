<script lang="ts">
	import * as Card from '@compdata/ui/card';
	import { iconFor } from '../../admin/icons';
	import type { AdminLayoutData } from '../../routes/admin/layout';
	import type { load } from '../../routes/admin/dashboard';

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
						>{data.counts[collection.name] ?? 0} Dokument(e) · {collection.blocks.length
							? `${collection.blocks.length} Block-Typen`
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
				<Card.Description>{data.submissionCount} Formular-Einsendung(en)</Card.Description>
			</Card.Header>
		</Card.Root>
	</a>
	<a href="/admin/media" class="block">
		<Card.Root class="hover:border-primary h-full transition-colors">
			<Card.Header>
				<Card.Title>Medien</Card.Title>
				<Card.Description>{data.mediaCount} Datei(en)</Card.Description>
			</Card.Header>
		</Card.Root>
	</a>
</div>
