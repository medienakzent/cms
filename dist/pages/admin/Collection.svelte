<script lang="ts">
	import { formatDateTime } from '../../format';
	import { goto } from '$app/navigation';
	import { Button } from '@compdata/ui/button';
	import { Badge } from '@compdata/ui/badge';
	import { Input } from '@compdata/ui/input';
	import { Tabs } from '@compdata/ui/tabs';
	import * as Table from '@compdata/ui/table';
	import PlusIcon from '@lucide/svelte/icons/plus';

	import type { AdminLayoutData } from '../../routes/admin/layout';
	import type { load } from '../../routes/admin/collection';

	let { data }: { data: AdminLayoutData & Awaited<ReturnType<typeof load>> } = $props();

	const tabs = $derived(
		data.languages.map((language) => ({ id: language.code, label: language.label }))
	);
	// svelte-ignore state_referenced_locally
	let active = $state(data.lang);
	$effect(() => {
		if (active !== data.lang)
			goto(`/admin/${data.def.name}?lang=${active}&q=${encodeURIComponent(data.q)}`);
	});
</script>

<div class="mb-4 flex flex-wrap items-center justify-between gap-3">
	<h1 class="text-2xl font-semibold">
		{data.def.labelPlural}
		<span class="text-muted-foreground text-base font-normal">({data.rows.length})</span>
	</h1>
	<div class="flex items-center gap-2">
		<form method="get">
			<input type="hidden" name="lang" value={data.lang} />
			<Input type="search" name="q" value={data.q} placeholder="Suchen …" class="w-56" />
		</form>
		<Button href="/admin/{data.def.name}/new?lang={data.lang}"
			><PlusIcon aria-hidden="true" /> {data.def.label} anlegen</Button
		>
	</div>
</div>

<div class="mb-4"><Tabs {tabs} bind:active /></div>

{#if data.rows.length === 0}
	<p class="text-muted-foreground">Noch keine Einträge.</p>
{:else}
	<Table.Table>
		<Table.TableHeader>
			<Table.TableRow>
				<Table.TableHead>Titel</Table.TableHead>
				<Table.TableHead>Slug</Table.TableHead>
				<Table.TableHead>Status ({data.lang.toUpperCase()})</Table.TableHead>
				<Table.TableHead>Sprachen</Table.TableHead>
				<Table.TableHead>Geändert</Table.TableHead>
			</Table.TableRow>
		</Table.TableHeader>
		<Table.TableBody>
			{#each data.rows as { row, langs } (row.slug)}
				{@const inLang = langs.find((entry) => entry.lang === data.lang)}
				<Table.TableRow>
					<Table.TableCell
						><a
							href="/admin/{data.def.name}/{row.slug}?lang={data.lang}"
							class="font-medium hover:underline">{row.title || row.slug}</a
						></Table.TableCell
					>
					<Table.TableCell><code class="text-xs">{row.slug}</code></Table.TableCell>
					<Table.TableCell>
						{#if !inLang}<Badge variant="info">fehlt</Badge>
						{:else if inLang.status === 'published'}<Badge variant="positive">Veröffentlicht</Badge>
						{:else}<Badge variant="warning">Entwurf</Badge>{/if}
					</Table.TableCell>
					<Table.TableCell>
						<span class="flex gap-1">
							{#each langs as entry (entry.lang)}
								<Badge variant={entry.status === 'published' ? 'positive' : 'neutral'}
									>{entry.lang.toUpperCase()}</Badge
								>
							{/each}
						</span>
					</Table.TableCell>
					<Table.TableCell class="text-muted-foreground text-sm"
						>{formatDateTime((inLang ?? row).updatedAt)} · {(inLang ?? row)
							.updatedBy}</Table.TableCell
					>
				</Table.TableRow>
			{/each}
		</Table.TableBody>
	</Table.Table>
{/if}
