<script lang="ts">
	import { contrastBackdrop } from './thumbnail-tone';
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
	import FieldHelp from './FieldHelp.svelte';
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
		onchange: (value: unknown) => void;
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

	const stringValue = $derived(typeof value === 'string' ? value : '');
	const numberValue = $derived(typeof value === 'number' ? value : null);
	const booleanValue = $derived(value === true);
	const list = $derived(Array.isArray(value) ? (value as unknown[]) : []);
	const stringList = $derived(list.filter((item): item is string => typeof item === 'string'));
	const objectValue = $derived(
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
	const asObject = (candidate: unknown): Record<string, unknown> =>
		typeof candidate === 'object' && candidate !== null && !Array.isArray(candidate)
			? (candidate as Record<string, unknown>)
			: {};

	let mediaOpen = $state(false);

	function listSet(index: number, itemValue: unknown) {
		const next = [...list];
		next[index] = itemValue;
		onchange(next);
	}
	function listAdd() {
		if (field.kind !== 'list') return;
		onchange([...list, defaultValue(field.of)]);
	}
	function listRemove(index: number) {
		onchange(list.filter((_, itemIndex) => itemIndex !== index));
	}
	function listMove(index: number, direction: -1 | 1) {
		const targetIndex = index + direction;
		if (targetIndex < 0 || targetIndex >= list.length) return;
		const next = [...list];
		[next[index], next[targetIndex]] = [next[targetIndex], next[index]];
		onchange(next);
	}
	function toggleMulti(option: string, checked: boolean) {
		const selectedOptions = new Set(stringList);
		if (checked) selectedOptions.add(option);
		else selectedOptions.delete(option);
		onchange([...selectedOptions]);
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
			{#if field.help}<FieldHelp text={field.help} {label} />{/if}
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
			value={stringValue}
			placeholder={field.placeholder}
			maxlength={field.maxLength}
			oninput={(event) => onchange(event.currentTarget.value)}
		/>
	{:else if field.kind === 'textarea'}
		<Textarea
			{id}
			value={stringValue}
			rows={field.rows ?? 3}
			maxlength={field.maxLength}
			oninput={(event) => onchange(event.currentTarget.value)}
		/>
	{:else if field.kind === 'richtext'}
		<MarkdownEditor {id} value={stringValue} onchange={(markdown) => onchange(markdown)} />
	{:else if field.kind === 'number'}
		<Input
			{id}
			type="number"
			value={numberValue ?? ''}
			min={field.min}
			max={field.max}
			step={field.step ?? (field.integer ? 1 : 'any')}
			oninput={(event) =>
				onchange(event.currentTarget.value === '' ? null : Number(event.currentTarget.value))}
		/>
	{:else if field.kind === 'boolean'}
		<div class="flex items-center gap-2 py-1">
			<Checkbox
				{id}
				checked={booleanValue}
				onCheckedChange={(checked) => onchange(checked === true)}
			/>
			<Label for={id}>{label}</Label>
			{#if field.help}<FieldHelp text={field.help} {label} />{/if}
			{#if showScope && !field.localized}<Badge variant="id">alle Sprachen</Badge>{/if}
		</div>
	{:else if field.kind === 'date'}
		<Input
			{id}
			type={field.withTime ? 'datetime-local' : 'date'}
			value={field.withTime ? stringValue.slice(0, 16) : stringValue.slice(0, 10)}
			oninput={(event) => onchange(event.currentTarget.value)}
		/>
	{:else if field.kind === 'select'}
		<SearchableSelect
			{id}
			value={stringValue || null}
			options={[
				...(field.required ? [] : [{ value: '', label: '— keine Auswahl —' }]),
				...field.options.map((option) => ({
					value: optionValue(option),
					label: optionLabel(option)
				}))
			]}
			onSelect={(selectedValue) => onchange(selectedValue || null)}
			placeholder="Auswählen …"
			searchable={field.options.length > 8}
		/>
	{:else if field.kind === 'multiselect'}
		<div class="flex flex-wrap gap-x-5 gap-y-2">
			{#each field.options as option (optionValue(option))}
				{@const optionKey = optionValue(option)}
				<label class="flex items-center gap-2 text-sm">
					<Checkbox
						checked={stringList.includes(optionKey)}
						onCheckedChange={(checked) => toggleMulti(optionKey, checked === true)}
					/>
					{optionLabel(option)}
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
						use:contrastBackdrop
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
						oninput={(event) => onchange({ ...media, alt: event.currentTarget.value })}
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
			onselect={(mediaRef) => onchange(mediaRef)}
		/>
	{:else if field.kind === 'link'}
		<div class="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
			<Input
				{id}
				value={link?.href ?? ''}
				placeholder="https://… oder /pfad"
				oninput={(event) => setLink({ href: event.currentTarget.value })}
			/>
			<Input
				value={link?.label ?? ''}
				placeholder="Beschriftung"
				oninput={(event) => setLink({ label: event.currentTarget.value })}
			/>
			<label class="flex items-center gap-2 text-sm whitespace-nowrap">
				<Checkbox
					checked={link?.target === '_blank'}
					onCheckedChange={(checked) => setLink({ target: checked === true ? '_blank' : '_self' })}
				/>
				Neuer Tab
			</label>
		</div>
	{:else if field.kind === 'reference'}
		<ReferencePicker
			{id}
			collection={field.collection}
			{lang}
			value={stringValue || null}
			onchange={(reference) => onchange(reference)}
		/>
	{:else if field.kind === 'references'}
		<ReferencePicker
			{id}
			collection={field.collection}
			{lang}
			multiple
			value={stringList}
			onchange={(references) => onchange(references)}
		/>
	{:else if field.kind === 'list'}
		<div class="space-y-3">
			{#each list as item, index (index)}
				<div class="border-border rounded-md border p-3">
					<div class="mb-2 flex items-center justify-between">
						<span class="text-muted-foreground text-xs font-medium"
							>{field.itemLabel ?? 'Eintrag'} {index + 1}</span
						>
						<div class="flex gap-1">
							<Button
								size="icon-sm"
								variant="ghost"
								onclick={() => listMove(index, -1)}
								disabled={index === 0}
								aria-label="Nach oben"><ChevronUpIcon aria-hidden="true" /></Button
							>
							<Button
								size="icon-sm"
								variant="ghost"
								onclick={() => listMove(index, 1)}
								disabled={index === list.length - 1}
								aria-label="Nach unten"><ChevronDownIcon aria-hidden="true" /></Button
							>
							<Button
								size="icon-sm"
								variant="ghost"
								onclick={() => listRemove(index)}
								aria-label="Entfernen"><TrashIcon aria-hidden="true" /></Button
							>
						</div>
					</div>
					{#if field.of.kind === 'group'}
						<FieldsForm
							fields={field.of.fields}
							value={asObject(item)}
							onchange={(itemValue) => listSet(index, itemValue)}
							path={`${path}[${index}].`}
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
							onchange={(itemValue) => listSet(index, itemValue)}
							path={`${path}[${index}]`}
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
				value={objectValue}
				onchange={(groupValue) => onchange(groupValue)}
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
			onchange={(blocks) => onchange(blocks)}
		/>
	{/if}

	{#if error}<p class="text-destructive text-xs">{error}</p>{/if}
</div>
