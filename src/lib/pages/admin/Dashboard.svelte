<script lang="ts">
	import * as Card from '@compdata/ui/card';
	import { iconFor } from '../../admin/icons';
	import type { AdminLayoutData } from '../../routes/admin/layout';
	import type { load } from '../../routes/admin/dashboard';

	let { data }: { data: AdminLayoutData & Awaited<ReturnType<typeof load>> } = $props();
</script>

<h1 class="mb-6 text-2xl font-semibold">Übersicht</h1>

<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
	{#each data.collections as c (c.name)}
		{@const Icon = iconFor(c.icon)}
		<a href="/admin/{c.name}" class="block">
			<Card.Root class="hover:border-primary h-full transition-colors">
				<Card.Header>
					<Card.Title class="flex items-center gap-2"><Icon class="text-muted-foreground size-4" /> {c.labelPlural}</Card.Title>
					<Card.Description>{data.counts[c.name] ?? 0} Dokument(e) · {c.blocks.length ? `${c.blocks.length} Block-Typen` : 'ohne Blocks'}</Card.Description>
				</Card.Header>
			</Card.Root>
		</a>
	{/each}
	<a href="/admin/media" class="block">
		<Card.Root class="hover:border-primary h-full transition-colors">
			<Card.Header>
				<Card.Title>Medien</Card.Title>
				<Card.Description>{data.mediaCount} Datei(en)</Card.Description>
			</Card.Header>
		</Card.Root>
	</a>
</div>

<h2 class="mt-10 mb-3 text-lg font-semibold">Registrierte Blocks</h2>
<ul class="text-muted-foreground flex flex-wrap gap-2 text-sm">
	{#each data.blocks as b (b.name)}
		<li class="border-border rounded-md border px-2 py-1"><span class="text-foreground">{b.label}</span> · {b.name} v{b.version}</li>
	{/each}
</ul>
<p class="text-muted-foreground mt-6 text-sm">
	Struktur ändern: <code>src/blocks/&lt;name&gt;/block.ts</code> und <code>src/collections/&lt;name&gt;.ts</code> — siehe die README-Dateien dort.
</p>
