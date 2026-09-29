<script lang="ts">
	import { nanoid } from 'nanoid';
	import { emptyValues } from '../localize';
	import type { RenderBlock } from '../types';
	import type { AdminBlock } from './types';
	import FieldsForm from './FieldsForm.svelte';
	import { iconFor } from './icons';
	import { Button } from '@compdata/ui/button';
	import { SearchableSelect } from '@compdata/ui/select';
	import ChevronUpIcon from '@lucide/svelte/icons/chevron-up';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import TrashIcon from '@lucide/svelte/icons/trash-2';
	import CopyIcon from '@lucide/svelte/icons/copy';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';

	type Props = {
		blocks: RenderBlock[];
		allowed: string[];
		blockDefs: Record<string, AdminBlock>;
		lang: string;
		errors: Record<string, string>;
		/** Pfad-Präfix (`blocks` an der Wurzel). */
		path?: string;
		onchange: (blocks: RenderBlock[]) => void;
		/** Aufgeklappte Block-IDs, Standard: alle zu. Bindbar, damit der Editor alle auf-/zuklappen kann. */
		expanded?: Set<string>;
	};

	let { blocks, allowed, blockDefs, lang, errors, path = 'blocks', onchange, expanded = $bindable(new Set<string>()) }: Props = $props();

	const options = $derived(
		allowed
			.filter((n) => blockDefs[n])
			.map((n) => ({ value: n, label: blockDefs[n].label }))
	);

	function add(type: string) {
		const def = blockDefs[type];
		if (!def) return;
		const id = nanoid(8);
		onchange([...blocks, { id, type, data: emptyValues(def.fields) }]);
		expanded = new Set([...expanded, id]);
	}
	function update(i: number, data: Record<string, unknown>) {
		const next = [...blocks];
		next[i] = { ...next[i], data };
		onchange(next);
	}
	function remove(i: number) {
		onchange(blocks.filter((_, j) => j !== i));
	}
	function move(i: number, dir: -1 | 1) {
		const j = i + dir;
		if (j < 0 || j >= blocks.length) return;
		const next = [...blocks];
		[next[i], next[j]] = [next[j], next[i]];
		onchange(next);
	}
	function duplicate(i: number) {
		const src = blocks[i];
		const copy = { id: nanoid(8), type: src.type, data: structuredClone($state.snapshot(src.data)) };
		onchange([...blocks.slice(0, i + 1), copy, ...blocks.slice(i + 1)]);
	}
	function toggle(id: string) {
		const next = new Set(expanded);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		expanded = next;
	}
	function hasError(prefix: string) {
		return Object.keys(errors).some((k) => k.startsWith(prefix));
	}
	function summary(block: RenderBlock): string {
		const def = blockDefs[block.type];
		if (!def) return '';
		for (const [k, f] of Object.entries(def.fields)) {
			if ((f.kind === 'text' || f.kind === 'textarea') && typeof block.data[k] === 'string' && block.data[k]) {
				return String(block.data[k]).slice(0, 60);
			}
		}
		return '';
	}
</script>

<div class="space-y-3">
	{#each blocks as block, i (block.id)}
		{@const def = blockDefs[block.type]}
		{@const Icon = iconFor(def?.icon)}
		{@const blockPath = `${path}[${i}]`}
		{@const open = expanded.has(block.id)}
		<div class="border-border bg-card rounded-lg border {hasError(blockPath) ? 'border-destructive' : ''}">
			<div class="flex items-center gap-2 px-3 py-2">
				<button type="button" class="flex flex-1 items-center gap-2 text-start" onclick={() => toggle(block.id)}>
					<ChevronRightIcon class="size-4 transition-transform {open ? 'rotate-90' : ''}" aria-hidden="true" />
					<Icon class="text-muted-foreground size-4" />
					<span class="font-medium">{def?.label ?? block.type}</span>
					{#if !open}<span class="text-muted-foreground truncate text-sm">{summary(block)}</span>{/if}
					{#if !def}<span class="text-destructive text-xs">Unbekannter Block-Typ</span>{/if}
				</button>
				<Button size="icon-sm" variant="ghost" onclick={() => move(i, -1)} disabled={i === 0} aria-label="Nach oben"><ChevronUpIcon aria-hidden="true" /></Button>
				<Button size="icon-sm" variant="ghost" onclick={() => move(i, 1)} disabled={i === blocks.length - 1} aria-label="Nach unten"><ChevronDownIcon aria-hidden="true" /></Button>
				<Button size="icon-sm" variant="ghost" onclick={() => duplicate(i)} aria-label="Duplizieren"><CopyIcon aria-hidden="true" /></Button>
				<Button size="icon-sm" variant="ghost" onclick={() => remove(i)} aria-label="Entfernen"><TrashIcon aria-hidden="true" /></Button>
			</div>
			{#if open && def}
				<div class="border-border border-t p-4">
					<FieldsForm fields={def.fields} value={block.data} onchange={(v) => update(i, v)} path={`${blockPath}.`} {errors} {lang} {blockDefs} />
				</div>
			{/if}
		</div>
	{/each}

	{#if options.length}
		<div class="flex items-center gap-2">
			<SearchableSelect {options} value={null} onSelect={add} placeholder="Block hinzufügen …" searchable={options.length > 6} ariaLabel="Block hinzufügen" class="w-64" />
		</div>
	{/if}
</div>
