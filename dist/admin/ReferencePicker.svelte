<script lang="ts">
	import type { IndexRow } from '../types';
	import { apiFetch } from './api-client';
	import { SearchableSelect } from '@compdata/ui/select';
	import { Badge } from '@compdata/ui/badge';
	import XIcon from '@lucide/svelte/icons/x';
	import { toast } from 'svelte-sonner';

	type Props = {
		id?: string;
		collection: string;
		lang: string;
		multiple?: boolean;
		value: string | null | string[];
		onchange: (value: string | null | string[]) => void;
	};

	let { id, collection, lang, multiple = false, value, onchange }: Props = $props();

	let rows = $state<IndexRow[]>([]);

	const selected = $derived(Array.isArray(value) ? value : value ? [value] : []);
	const titleBySlug = $derived(new Map(rows.map((row) => [row.slug, row.title || row.slug])));
	const options = $derived([
		...(multiple ? [] : [{ value: '', label: '— keine Auswahl —' }]),
		...rows
			.filter((row) => !multiple || !selected.includes(row.slug))
			.map((row) => ({ value: row.slug, label: row.title || row.slug }))
	]);

	$effect(() => {
		void collection;
		apiFetch<{ items: IndexRow[] }>(`/api/v1/${collection}?status=all&limit=200&sort=title`)
			.then((result) => {
				// One row per slug, preferring the current language.
				const rowBySlug = new Map<string, IndexRow>();
				for (const row of result.items) {
					const current = rowBySlug.get(row.slug);
					if (!current || row.lang === lang) rowBySlug.set(row.slug, row);
				}
				rows = [...rowBySlug.values()].sort((left, right) => left.title.localeCompare(right.title));
			})
			.catch((error: Error) => {
				rows = [];
				toast.error(`Referenzen konnten nicht geladen werden: ${error.message}`);
			});
	});

	function select(slug: string) {
		if (multiple) onchange([...selected, slug]);
		else onchange(slug || null);
	}
	function remove(slug: string) {
		onchange(selected.filter((selectedSlug) => selectedSlug !== slug));
	}
</script>

{#if multiple}
	<div class="flex flex-wrap items-center gap-2">
		{#each selected as slug (slug)}
			<Badge variant="neutral" class="gap-1">
				{titleBySlug.get(slug) ?? slug}
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
