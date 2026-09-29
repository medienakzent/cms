<script lang="ts">
	import type { IndexRow } from '../types';
	import { apiFetch } from './api-client';
	import { SearchableSelect } from '@compdata/ui/select';
	import { Badge } from '@compdata/ui/badge';
	import XIcon from '@lucide/svelte/icons/x';

	type Props = {
		id?: string;
		collection: string;
		lang: string;
		multiple?: boolean;
		value: string | null | string[];
		onchange: (v: string | null | string[]) => void;
	};

	let { id, collection, lang, multiple = false, value, onchange }: Props = $props();

	let rows = $state<IndexRow[]>([]);

	const selected = $derived(Array.isArray(value) ? value : value ? [value] : []);
	const byTitle = $derived(new Map(rows.map((r) => [r.slug, r.title || r.slug])));
	const options = $derived([
		...(multiple ? [] : [{ value: '', label: '— keine Auswahl —' }]),
		...rows
			.filter((r) => !multiple || !selected.includes(r.slug))
			.map((r) => ({ value: r.slug, label: r.title || r.slug }))
	]);

	$effect(() => {
		void collection;
		apiFetch<{ items: IndexRow[] }>(`/api/v1/${collection}?status=all&limit=500&order=asc`)
			.then((r) => {
				// Eine Zeile je Slug, bevorzugt in der aktuellen Sprache.
				const map = new Map<string, IndexRow>();
				for (const row of r.items) {
					const cur = map.get(row.slug);
					if (!cur || row.lang === lang) map.set(row.slug, row);
				}
				rows = [...map.values()].sort((a, b) => a.title.localeCompare(b.title));
			})
			.catch(() => (rows = []));
	});

	function select(slug: string) {
		if (multiple) onchange([...selected, slug]);
		else onchange(slug || null);
	}
	function remove(slug: string) {
		onchange(selected.filter((s) => s !== slug));
	}
</script>

{#if multiple}
	<div class="flex flex-wrap items-center gap-2">
		{#each selected as slug (slug)}
			<Badge variant="neutral" class="gap-1">
				{byTitle.get(slug) ?? slug}
				<button type="button" onclick={() => remove(slug)} aria-label="Entfernen"
					><XIcon class="size-3" /></button
				>
			</Badge>
		{/each}
		<SearchableSelect
			{id}
			{options}
			value={null}
			onSelect={select}
			placeholder="Hinzufügen …"
			searchable
			class="w-56"
		/>
	</div>
{:else}
	<SearchableSelect
		{id}
		{options}
		value={selected[0] ?? null}
		onSelect={select}
		placeholder="Auswählen …"
		searchable
	/>
{/if}
