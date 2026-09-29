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
		/** Path prefix (`blocks` at the root). */
		path?: string;
		onchange: (blocks: RenderBlock[]) => void;
		/** Expanded block ids, all collapsed by default. Bindable so the editor can expand/collapse all. */
		expanded?: Set<string>;
	};

	let {
		blocks,
		allowed,
		blockDefs,
		lang,
		errors,
		path = 'blocks',
		onchange,
		expanded = $bindable(new Set<string>())
	}: Props = $props();

	const options = $derived(
		allowed
			.filter((blockType) => blockDefs[blockType])
			.map((blockType) => ({ value: blockType, label: blockDefs[blockType].label }))
	);

	function add(type: string) {
		const definition = blockDefs[type];
		if (!definition) return;
		const id = nanoid(8);
		onchange([...blocks, { id, type, data: emptyValues(definition.fields) }]);
		expanded = new Set([...expanded, id]);
	}
	function update(index: number, data: Record<string, unknown>) {
		const next = [...blocks];
		next[index] = { ...next[index], data };
		onchange(next);
	}
	function remove(index: number) {
		onchange(blocks.filter((_, blockIndex) => blockIndex !== index));
	}
	function move(index: number, direction: -1 | 1) {
		const targetIndex = index + direction;
		if (targetIndex < 0 || targetIndex >= blocks.length) return;
		const next = [...blocks];
		[next[index], next[targetIndex]] = [next[targetIndex], next[index]];
		onchange(next);
	}
	function duplicate(index: number) {
		const source = blocks[index];
		const copy = {
			id: nanoid(8),
			type: source.type,
			data: structuredClone($state.snapshot(source.data))
		};
		onchange([...blocks.slice(0, index + 1), copy, ...blocks.slice(index + 1)]);
	}
	function toggle(id: string) {
		const next = new Set(expanded);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		expanded = next;
	}
	function hasError(prefix: string) {
		return Object.keys(errors).some((errorPath) => errorPath.startsWith(prefix));
	}
	function summary(block: RenderBlock): string {
		const definition = blockDefs[block.type];
		if (!definition) return '';
		for (const [fieldKey, fieldDefinition] of Object.entries(definition.fields)) {
			if (
				(fieldDefinition.kind === 'text' || fieldDefinition.kind === 'textarea') &&
				typeof block.data[fieldKey] === 'string' &&
				block.data[fieldKey]
			) {
				return String(block.data[fieldKey]).slice(0, 60);
			}
		}
		return '';
	}
</script>

<div class="space-y-3">
	{#each blocks as block, index (block.id)}
		{@const definition = blockDefs[block.type]}
		{@const Icon = iconFor(definition?.icon)}
		{@const blockPath = `${path}[${index}]`}
		{@const open = expanded.has(block.id)}
		<div
			class="border-border bg-card rounded-lg border {hasError(blockPath)
				? 'border-destructive'
				: ''}"
		>
			<div class="flex items-center gap-2 px-3 py-2">
				<button
					type="button"
					class="flex flex-1 items-center gap-2 text-start"
					onclick={() => toggle(block.id)}
				>
					<ChevronRightIcon
						class="size-4 transition-transform {open ? 'rotate-90' : ''}"
						aria-hidden="true"
					/>
					<Icon class="text-muted-foreground size-4" />
					<span class="font-medium">{definition?.label ?? block.type}</span>
					{#if !open}<span class="text-muted-foreground truncate text-sm">{summary(block)}</span
						>{/if}
					{#if !definition}<span class="text-destructive text-xs">Unbekannter Block-Typ</span>{/if}
				</button>
				<Button
					size="icon-sm"
					variant="ghost"
					onclick={() => move(index, -1)}
					disabled={index === 0}
					aria-label="Nach oben"><ChevronUpIcon aria-hidden="true" /></Button
				>
				<Button
					size="icon-sm"
					variant="ghost"
					onclick={() => move(index, 1)}
					disabled={index === blocks.length - 1}
					aria-label="Nach unten"><ChevronDownIcon aria-hidden="true" /></Button
				>
				<Button
					size="icon-sm"
					variant="ghost"
					onclick={() => duplicate(index)}
					aria-label="Duplizieren"><CopyIcon aria-hidden="true" /></Button
				>
				<Button size="icon-sm" variant="ghost" onclick={() => remove(index)} aria-label="Entfernen"
					><TrashIcon aria-hidden="true" /></Button
				>
			</div>
			{#if open && definition}
				<div class="border-border border-t p-4">
					<FieldsForm
						fields={definition.fields}
						value={block.data}
						onchange={(data) => update(index, data)}
						path={`${blockPath}.`}
						{errors}
						{lang}
						{blockDefs}
					/>
				</div>
			{/if}
		</div>
	{/each}

	{#if options.length}
		<div class="flex items-center gap-2">
			<SearchableSelect
				{options}
				value={null}
				onSelect={add}
				placeholder="Block hinzufügen …"
				searchable={options.length > 6}
				ariaLabel="Block hinzufügen"
				class="w-64"
			/>
		</div>
	{/if}
</div>
