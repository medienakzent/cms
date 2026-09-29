<script lang="ts">
	import type { Field } from '../fields';
	import { fieldLabel, optionLabel, optionValue } from '../fields';
	import { defaultValue } from '../validate';
	import { mediaUrl } from '../media-url';
	import type { Link, MediaRef, RenderBlock } from '../types';
	import type { AdminBlock } from './types';
	import { Input } from '@compdata/ui/input';
	import { Textarea } from '@compdata/ui/textarea';
	import { Checkbox } from '@compdata/ui/checkbox';
	import { Label } from '@compdata/ui/label';
	import { Button } from '@compdata/ui/button';
	import { Badge } from '@compdata/ui/badge';
	import { SearchableSelect } from '@compdata/ui/select';
	import MarkdownEditor from './MarkdownEditor.svelte';
	import FieldsForm from './FieldsForm.svelte';
	import FieldEditor from './FieldEditor.svelte';
	import BlocksEditor from './BlocksEditor.svelte';
	import MediaPicker from './MediaPicker.svelte';
	import ReferencePicker from './ReferencePicker.svelte';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import TrashIcon from '@lucide/svelte/icons/trash-2';
	import ChevronUpIcon from '@lucide/svelte/icons/chevron-up';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';

	type Props = {
		field: Field;
		name: string;
		value: unknown;
		onchange: (v: unknown) => void;
		path: string;
		errors: Record<string, string>;
		lang: string;
		blockDefs: Record<string, AdminBlock>;
		showScope?: boolean;
	};

	let {
		field,
		name,
		value,
		onchange,
		path,
		errors,
		lang,
		blockDefs,
		showScope = true
	}: Props = $props();

	const label = $derived(fieldLabel(name, field));
	const error = $derived(errors[path]);
	const id = $derived(`f-${path.replace(/[^a-zA-Z0-9]+/g, '-')}`);
	const scopeBelow = $derived(showScope && !field.localized);

	// Typisierte Sichten auf den unbekannten Wert
	const str = $derived(typeof value === 'string' ? value : '');
	const num = $derived(typeof value === 'number' ? value : null);
	const bool = $derived(value === true);
	const list = $derived(Array.isArray(value) ? (value as unknown[]) : []);
	const strList = $derived(list.filter((x): x is string => typeof x === 'string'));
	const obj = $derived(
		typeof value === 'object' && value !== null && !Array.isArray(value)
			? (value as Record<string, unknown>)
			: {}
	);
	const media = $derived(
		typeof value === 'object' && value !== null && 'src' in (value as object)
			? (value as MediaRef)
			: null
	);
	const link = $derived(
		typeof value === 'object' && value !== null && 'href' in (value as object)
			? (value as Link)
			: null
	);

	const blockList = $derived(list as RenderBlock[]);
	const asObj = (v: unknown): Record<string, unknown> =>
		typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : {};

	let mediaOpen = $state(false);

	function listSet(i: number, v: unknown) {
		const next = [...list];
		next[i] = v;
		onchange(next);
	}
	function listAdd() {
		if (field.kind !== 'list') return;
		onchange([...list, defaultValue(field.of)]);
	}
	function listRemove(i: number) {
		onchange(list.filter((_, j) => j !== i));
	}
	function listMove(i: number, dir: -1 | 1) {
		const j = i + dir;
		if (j < 0 || j >= list.length) return;
		const next = [...list];
		[next[i], next[j]] = [next[j], next[i]];
		onchange(next);
	}
	function toggleMulti(opt: string, on: boolean) {
		const set = new Set(strList);
		if (on) set.add(opt);
		else set.delete(opt);
		onchange([...set]);
	}
	function setLink(patch: Partial<Link>) {
		onchange({
			href: link?.href ?? '',
			label: link?.label ?? '',
			target: link?.target ?? '_self',
			...patch
		});
	}
</script>

<div class="space-y-1.5" data-invalid={!!error}>
	{#if field.kind !== 'boolean'}
		<div class="flex items-center gap-2">
			<Label for={id}
				>{label}{#if field.required}<span class="text-destructive"> *</span>{/if}</Label
			>
			{#if showScope}
				{#if field.localized}
					<Badge variant="info" title="Wird pro Sprache gespeichert">{lang.toUpperCase()}</Badge>
				{:else}
					<Badge variant="id" title="Gilt für alle Sprachen">alle Sprachen</Badge>
				{/if}
			{/if}
		</div>
	{/if}

	{#if field.kind === 'text'}
		<Input
			{id}
			value={str}
			placeholder={field.placeholder}
			maxlength={field.maxLength}
			oninput={(e) => onchange(e.currentTarget.value)}
		/>
	{:else if field.kind === 'textarea'}
		<Textarea
			{id}
			value={str}
			rows={field.rows ?? 3}
			maxlength={field.maxLength}
			oninput={(e) => onchange(e.currentTarget.value)}
		/>
	{:else if field.kind === 'richtext'}
		<MarkdownEditor {id} value={str} onchange={(v) => onchange(v)} />
	{:else if field.kind === 'number'}
		<Input
			{id}
			type="number"
			value={num ?? ''}
			min={field.min}
			max={field.max}
			step={field.step ?? (field.integer ? 1 : 'any')}
			oninput={(e) => onchange(e.currentTarget.value === '' ? null : Number(e.currentTarget.value))}
		/>
	{:else if field.kind === 'boolean'}
		<div class="flex items-center gap-2 py-1">
			<Checkbox {id} checked={bool} onCheckedChange={(v) => onchange(v === true)} />
			<Label for={id}>{label}</Label>
			{#if showScope && !field.localized}<Badge variant="id">alle Sprachen</Badge>{/if}
		</div>
	{:else if field.kind === 'date'}
		<Input
			{id}
			type={field.withTime ? 'datetime-local' : 'date'}
			value={field.withTime ? str.slice(0, 16) : str.slice(0, 10)}
			oninput={(e) => onchange(e.currentTarget.value)}
		/>
	{:else if field.kind === 'select'}
		<SearchableSelect
			{id}
			value={str || null}
			options={[
				...(field.required ? [] : [{ value: '', label: '— keine Auswahl —' }]),
				...field.options.map((o) => ({ value: optionValue(o), label: optionLabel(o) }))
			]}
			onSelect={(v) => onchange(v || null)}
			placeholder="Auswählen …"
			searchable={field.options.length > 8}
		/>
	{:else if field.kind === 'multiselect'}
		<div class="flex flex-wrap gap-x-5 gap-y-2">
			{#each field.options as o (optionValue(o))}
				{@const v = optionValue(o)}
				<label class="flex items-center gap-2 text-sm">
					<Checkbox
						checked={strList.includes(v)}
						onCheckedChange={(on) => toggleMulti(v, on === true)}
					/>
					{optionLabel(o)}
				</label>
			{/each}
		</div>
	{:else if field.kind === 'media'}
		<div class="border-border flex items-start gap-4 rounded-md border p-3">
			{#if media}
				{#if media.kind === 'image'}
					<img
						src={mediaUrl(media, 'thumb')}
						alt={media.alt}
						class="size-24 rounded object-cover"
					/>
				{:else}
					<div
						class="bg-muted text-muted-foreground flex size-24 items-center justify-center rounded text-xs"
					>
						{media.mime}
					</div>
				{/if}
				<div class="flex-1 space-y-2">
					<div class="text-muted-foreground truncate text-xs">{media.src}</div>
					<Input
						value={media.alt}
						placeholder="Alternativtext"
						oninput={(e) => onchange({ ...media, alt: e.currentTarget.value })}
					/>
					<div class="flex gap-2">
						<Button size="sm" variant="outline" onclick={() => (mediaOpen = true)}>Ersetzen</Button>
						<Button size="sm" variant="ghost" onclick={() => onchange(null)}
							><TrashIcon aria-hidden="true" /> Entfernen</Button
						>
					</div>
				</div>
			{:else}
				<Button size="sm" variant="outline" onclick={() => (mediaOpen = true)}
					><PlusIcon aria-hidden="true" /> Medium auswählen</Button
				>
			{/if}
		</div>
		<MediaPicker
			bind:open={mediaOpen}
			accept={field.accept ?? 'any'}
			onselect={(ref) => onchange(ref)}
		/>
	{:else if field.kind === 'link'}
		<div class="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
			<Input
				{id}
				value={link?.href ?? ''}
				placeholder="https://… oder /pfad"
				oninput={(e) => setLink({ href: e.currentTarget.value })}
			/>
			<Input
				value={link?.label ?? ''}
				placeholder="Beschriftung"
				oninput={(e) => setLink({ label: e.currentTarget.value })}
			/>
			<label class="flex items-center gap-2 text-sm whitespace-nowrap">
				<Checkbox
					checked={link?.target === '_blank'}
					onCheckedChange={(v) => setLink({ target: v === true ? '_blank' : '_self' })}
				/>
				Neuer Tab
			</label>
		</div>
	{:else if field.kind === 'reference'}
		<ReferencePicker
			{id}
			collection={field.collection}
			{lang}
			value={str || null}
			onchange={(v) => onchange(v)}
		/>
	{:else if field.kind === 'references'}
		<ReferencePicker
			{id}
			collection={field.collection}
			{lang}
			multiple
			value={strList}
			onchange={(v) => onchange(v)}
		/>
	{:else if field.kind === 'list'}
		<div class="space-y-3">
			{#each list as item, i (i)}
				<div class="border-border rounded-md border p-3">
					<div class="mb-2 flex items-center justify-between">
						<span class="text-muted-foreground text-xs font-medium"
							>{field.itemLabel ?? 'Eintrag'} {i + 1}</span
						>
						<div class="flex gap-1">
							<Button
								size="icon-sm"
								variant="ghost"
								onclick={() => listMove(i, -1)}
								disabled={i === 0}
								aria-label="Nach oben"><ChevronUpIcon aria-hidden="true" /></Button
							>
							<Button
								size="icon-sm"
								variant="ghost"
								onclick={() => listMove(i, 1)}
								disabled={i === list.length - 1}
								aria-label="Nach unten"><ChevronDownIcon aria-hidden="true" /></Button
							>
							<Button
								size="icon-sm"
								variant="ghost"
								onclick={() => listRemove(i)}
								aria-label="Entfernen"><TrashIcon aria-hidden="true" /></Button
							>
						</div>
					</div>
					{#if field.of.kind === 'group'}
						<FieldsForm
							fields={field.of.fields}
							value={asObj(item)}
							onchange={(v) => listSet(i, v)}
							path={`${path}[${i}].`}
							{errors}
							{lang}
							{blockDefs}
							showScope={false}
						/>
					{:else}
						<FieldEditor
							field={field.of}
							name={field.itemLabel ?? name}
							value={item}
							onchange={(v) => listSet(i, v)}
							path={`${path}[${i}]`}
							{errors}
							{lang}
							{blockDefs}
							showScope={false}
						/>
					{/if}
				</div>
			{/each}
			<Button
				size="sm"
				variant="outline"
				onclick={listAdd}
				disabled={field.max !== undefined && list.length >= field.max}
			>
				<PlusIcon aria-hidden="true" />
				{field.itemLabel ?? 'Eintrag'} hinzufügen
			</Button>
		</div>
	{:else if field.kind === 'group'}
		<div class="border-border rounded-md border p-3">
			<FieldsForm
				fields={field.fields}
				value={obj}
				onchange={(v) => onchange(v)}
				path={`${path}.`}
				{errors}
				{lang}
				{blockDefs}
				showScope={scopeBelow}
			/>
		</div>
	{:else if field.kind === 'file'}
		<p class="text-muted-foreground text-sm">
			Datei-Upload — nur in Formularen (Mail-Vorlagen) nutzbar.
		</p>
	{:else if field.kind === 'blocks'}
		<BlocksEditor
			blocks={blockList}
			allowed={field.allow ? [...field.allow] : Object.keys(blockDefs)}
			{blockDefs}
			{lang}
			{errors}
			{path}
			onchange={(v) => onchange(v)}
		/>
	{/if}

	{#if field.help}<p class="text-muted-foreground text-xs">{field.help}</p>{/if}
	{#if error}<p class="text-destructive text-xs">{error}</p>{/if}
</div>
