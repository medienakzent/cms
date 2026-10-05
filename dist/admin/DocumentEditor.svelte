<script lang="ts">
	import { tick } from 'svelte';
	import { formatCount, formatDateTime } from '../format';
	import { beforeNavigate, goto, invalidateAll } from '$app/navigation';
	import type { Document, DocumentStatus, RenderBlock, VersionInfo } from '../types';
	import type { LanguageConfig } from '../config';
	import type { AdminBlock, AdminCollection } from './types';
	import { apiFetch, ApiError, issuesToMap } from './api-client';
	import FieldsForm from './FieldsForm.svelte';
	import FieldEditor from './FieldEditor.svelte';
	import BlocksEditor from './BlocksEditor.svelte';
	import { getCmsContext } from '../context';
	import { localizePath } from '../config';
	import {
		PREVIEW_EVENT,
		PREVIEW_MESSAGE,
		PREVIEW_READY_MESSAGE,
		type PreviewEvent
	} from '../preview';
	import type { EditorView } from '../collection';
	import { emptyValues } from '../localize';
	import { nanoid } from 'nanoid';
	import MediaPicker from './MediaPicker.svelte';
	import { SearchableSelect } from '@compdata/ui/select';
	import type { FieldMap } from '../fields';
	import { Button } from '@compdata/ui/button';
	import { Badge } from '@compdata/ui/badge';
	import { CountBadge } from '@compdata/ui/count-badge';
	import { ConfirmDialog } from '@compdata/ui/confirm-dialog';
	import * as Sheet from '@compdata/ui/sheet';
	import SaveIcon from '@lucide/svelte/icons/save';
	import GlobeIcon from '@lucide/svelte/icons/globe';
	import HistoryIcon from '@lucide/svelte/icons/history';
	import TrashIcon from '@lucide/svelte/icons/trash-2';
	import EyeIcon from '@lucide/svelte/icons/eye';
	import ColumnsIcon from '@lucide/svelte/icons/columns-2';
	import ListIcon from '@lucide/svelte/icons/list';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import type { MediaRef } from '../types';
	import ExternalLinkIcon from '@lucide/svelte/icons/external-link';
	import Settings2Icon from '@lucide/svelte/icons/settings-2';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down';
	import ChevronsDownUpIcon from '@lucide/svelte/icons/chevrons-down-up';
	import { toast } from 'svelte-sonner';

	type Props = {
		collection: AdminCollection;
		blockDefs: Record<string, AdminBlock>;
		doc: Document;
		/** Whether this language version already exists in storage. */
		exists: boolean;
		lang: string;
		languages: LanguageConfig[];
		versions: VersionInfo[];
		previewHref: string | null;
	};

	let { collection, blockDefs, doc, exists, lang, languages, versions, previewHref }: Props =
		$props();

	// Initial values are copied once on purpose; the page remounts the editor via {#key}.
	// svelte-ignore state_referenced_locally
	let fields = $state<Record<string, unknown>>(structuredClone(doc.fields));
	// svelte-ignore state_referenced_locally
	let blocks = $state<RenderBlock[]>(structuredClone(doc.blocks));
	// svelte-ignore state_referenced_locally
	let status = $state<DocumentStatus>(doc.status);
	let dirty = $state(false);
	let busy = $state(false);
	let errors = $state<Record<string, string>>({});
	let confirm = $state<null | 'delete-lang' | 'delete-doc'>(null);
	let historyOpen = $state(false);
	let settingsOpen = $state(false);
	let expandedBlocks = $state(new Set<string>());
	const allExpanded = $derived(
		blocks.length > 0 && blocks.every((block) => expandedBlocks.has(block.id))
	);
	// svelte-ignore state_referenced_locally
	let view = $state<EditorView>(collection.blocks.length ? collection.editorView : 'form');
	const showForm = $derived(view !== 'preview' || !collection.blocks.length);
	const showPreview = $derived(view !== 'form');
	let selectedBlockId = $state<string | null>(null);
	/** Block whose form is open as a side sheet (preview-only view). */
	let sheetBlockId = $state<string | null>(null);
	const sheetIndex = $derived(blocks.findIndex((block) => block.id === sheetBlockId));
	let mediaTarget = $state<{ blockId: string; field: string } | null>(null);
	let mediaOpen = $state(false);
	let previewFrame = $state<HTMLIFrameElement | null>(null);
	let previewPanel = $state<HTMLElement | null>(null);
	const siteConfig = getCmsContext().config;
	const previewFrameSrc = $derived(localizePath(siteConfig, lang, '/cms-preview'));

	// The frame runs inside the site layout (its stylesheet and data); it receives the unsaved state.
	function postPreview() {
		previewFrame?.contentWindow?.postMessage(
			{
				type: PREVIEW_MESSAGE,
				lang,
				collection: collection.name,
				slug: doc.slug,
				fields: $state.snapshot(fields),
				blocks: $state.snapshot(blocks),
				editable: collection.blocks.length > 0,
				selectedBlockId
			},
			window.location.origin
		);
	}
	$effect(() => {
		if (!showPreview) return;
		postPreview();
	});
	$effect(() => {
		const onMessage = (event: MessageEvent<{ type?: string }>) => {
			if (event.origin !== window.location.origin || event.data?.type !== PREVIEW_READY_MESSAGE)
				return;
			postPreview();
		};
		window.addEventListener('message', onMessage);
		return () => window.removeEventListener('message', onMessage);
	});

	$effect(() => {
		const onEvent = (event: MessageEvent<PreviewEvent>) => {
			if (
				event.origin !== window.location.origin ||
				event.source !== previewFrame?.contentWindow ||
				event.data?.type !== PREVIEW_EVENT
			)
				return;
			void handlePreviewEvent(event.data);
		};
		window.addEventListener('message', onEvent);
		return () => window.removeEventListener('message', onEvent);
	});

	const viewKey = $derived(`cms.editor.view.${collection.name}`);
	$effect(() => {
		if (!collection.blocks.length) return;
		try {
			const stored = localStorage.getItem(viewKey);
			if (stored === 'form' || stored === 'split' || stored === 'preview') view = stored;
		} catch {
			/* storage unavailable */
		}
	});
	async function setView(nextView: EditorView) {
		view = nextView;
		try {
			localStorage.setItem(viewKey, nextView);
		} catch {
			/* storage unavailable */
		}
		// Below the two-column breakpoint the preview sits under the whole form; jump to it.
		if (nextView === 'split' && !window.matchMedia('(min-width: 1536px)').matches) {
			await tick();
			previewPanel?.scrollIntoView({ behavior: 'smooth', block: 'start' });
		}
	}

	const blockOptions = $derived(
		collection.blocks
			.filter((type) => blockDefs[type])
			.map((type) => ({ value: type, label: blockDefs[type].label }))
	);

	function updateBlockData(blockId: string, data: Record<string, unknown>) {
		setBlocks(blocks.map((block) => (block.id === blockId ? { ...block, data } : block)));
	}

	function addBlock(type: string) {
		const definition = blockDefs[type];
		if (!definition) return;
		const block = { id: nanoid(8), type, data: emptyValues(definition.fields) };
		setBlocks([...blocks, block]);
		void selectBlock(block.id);
	}

	/** Brings a block's form into view: expanded in the list, or as a sheet in the preview view. */
	async function selectBlock(blockId: string) {
		selectedBlockId = blockId;
		if (!showForm) {
			sheetBlockId = blockId;
			return;
		}
		expandedBlocks = new Set([...expandedBlocks, blockId]);
		await tick();
		document
			.getElementById(`cms-block-${blockId}`)
			?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}

	async function handlePreviewEvent(event: PreviewEvent) {
		const index = blocks.findIndex((block) => block.id === event.blockId);
		if (index < 0) return;
		const block = blocks[index];
		switch (event.action) {
			case 'select':
				await selectBlock(block.id);
				break;
			case 'input':
				updateBlockData(block.id, { ...block.data, [event.field]: event.value });
				break;
			case 'media':
				selectedBlockId = block.id;
				mediaTarget = { blockId: block.id, field: event.field };
				mediaOpen = true;
				break;
			case 'move-up':
			case 'move-down': {
				const target = index + (event.action === 'move-up' ? -1 : 1);
				if (target < 0 || target >= blocks.length) return;
				const next = [...blocks];
				[next[index], next[target]] = [next[target], next[index]];
				setBlocks(next);
				break;
			}
			case 'duplicate': {
				const copy = {
					id: nanoid(8),
					type: block.type,
					data: structuredClone($state.snapshot(block.data))
				};
				setBlocks([...blocks.slice(0, index + 1), copy, ...blocks.slice(index + 1)]);
				break;
			}
			case 'remove':
				setBlocks(blocks.filter((entry) => entry.id !== block.id));
				if (sheetBlockId === block.id) sheetBlockId = null;
				break;
		}
	}

	const mediaAccept = $derived.by((): 'image' | 'video' | 'file' | 'any' => {
		if (!mediaTarget) return 'any';
		const block = blocks.find((entry) => entry.id === mediaTarget!.blockId);
		const field = block ? blockDefs[block.type]?.fields[mediaTarget.field] : undefined;
		return field?.kind === 'media' ? (field.accept ?? 'any') : 'any';
	});

	function pickMedia(media: MediaRef) {
		const target = mediaTarget;
		const block = target ? blocks.find((entry) => entry.id === target.blockId) : undefined;
		if (!target || !block) return;
		updateBlockData(block.id, { ...block.data, [target.field]: media });
		mediaTarget = null;
	}

	/** Settings are all fields except the title, which is shown prominently at the top. */
	const settingsFields = $derived(
		Object.fromEntries(
			Object.entries(collection.fields).filter(([key]) => key !== collection.titleField)
		) as FieldMap
	);
	const titleField = $derived(collection.fields[collection.titleField]);
	const settingsErrorCount = $derived(
		Object.keys(errors).filter(
			(key) => !key.startsWith('blocks') && !key.startsWith(collection.titleField)
		).length
	);

	const apiBase = $derived(`/api/v1/${collection.name}/${doc.slug}`);
	const title = $derived(String(fields[collection.titleField] ?? '') || doc.slug);
	const langMeta = $derived(
		new Map(doc.langs.map((languageState) => [languageState.lang, languageState]))
	);

	beforeNavigate((navigation) => {
		if (!dirty || confirm) return;
		// On unload (reload, tab close) the browser shows its native prompt;
		// a custom confirm() is blocked there.
		if (navigation.willUnload) {
			navigation.cancel();
			return;
		}
		if (!window.confirm('Ungespeicherte Änderungen verwerfen?')) navigation.cancel();
	});

	function setFields(nextFields: Record<string, unknown>) {
		fields = nextFields;
		dirty = true;
	}
	function setBlocks(nextBlocks: RenderBlock[]) {
		blocks = nextBlocks;
		dirty = true;
	}

	async function save(nextStatus?: DocumentStatus) {
		busy = true;
		errors = {};
		try {
			const saved = await apiFetch<Document>(`${apiBase}?lang=${lang}`, {
				method: 'PUT',
				json: {
					fields: $state.snapshot(fields),
					blocks: $state.snapshot(blocks),
					status: nextStatus ?? status
				}
			});
			status = saved.status;
			dirty = false;
			toast.success(nextStatus === 'published' ? 'Veröffentlicht' : 'Gespeichert');
			await invalidateAll();
		} catch (error) {
			if (error instanceof ApiError && error.status === 422) {
				errors = issuesToMap(error.issues);
				toast.error(
					`${formatCount(error.issues.length, 'Problem', 'Probleme')} — bitte Felder prüfen`
				);
			} else toast.error((error as Error).message);
		} finally {
			busy = false;
		}
	}

	async function unpublish() {
		busy = true;
		try {
			await apiFetch(`${apiBase}/status`, { method: 'POST', json: { lang, status: 'draft' } });
			status = 'draft';
			toast.success('Auf Entwurf gesetzt');
			await invalidateAll();
		} catch (error) {
			toast.error((error as Error).message);
		} finally {
			busy = false;
		}
	}

	async function remove(whole: boolean) {
		busy = true;
		try {
			await apiFetch(whole ? apiBase : `${apiBase}?lang=${lang}`, { method: 'DELETE' });
			dirty = false;
			toast.success(whole ? 'Dokument gelöscht' : `Sprachfassung ${lang.toUpperCase()} gelöscht`);
			await goto(`/admin/${collection.name}`);
		} catch (error) {
			toast.error((error as Error).message);
			busy = false;
		} finally {
			confirm = null;
		}
	}

	async function restore(version: VersionInfo) {
		busy = true;
		try {
			await apiFetch(`${apiBase}/versions/${version.id}/restore`, { method: 'POST' });
			toast.success('Version wiederhergestellt');
			historyOpen = false;
			dirty = false;
			await invalidateAll();
			window.location.reload();
		} catch (error) {
			toast.error((error as Error).message);
			busy = false;
		}
	}
</script>

<div class="space-y-6">
	<div class="flex flex-wrap items-start justify-between gap-3">
		<div class="min-w-0">
			<h1 class="truncate text-2xl font-semibold">{title}</h1>
			<div class="text-muted-foreground mt-1 flex flex-wrap items-center gap-2 text-sm">
				<code class="text-xs">{collection.name}/{doc.slug}</code>
				{#if status === 'published'}<Badge variant="positive">Veröffentlicht</Badge>{:else}<Badge
						variant="warning">Entwurf</Badge
					>{/if}
				{#if !exists}<Badge variant="info">Neue Übersetzung</Badge>{/if}
				{#if dirty}<Badge variant="signal">Ungespeichert</Badge>{/if}
			</div>
		</div>
		<div class="flex flex-wrap gap-2">
			{#if collection.blocks.length}
				<div class="border-border flex rounded-md border p-0.5" role="group" aria-label="Ansicht">
					{#each [{ value: 'form', label: 'Formular', icon: ListIcon }, { value: 'split', label: 'Beides', icon: ColumnsIcon }, { value: 'preview', label: 'Vorschau', icon: EyeIcon }] as option (option.value)}
						<Button
							variant={view === option.value ? 'secondary' : 'ghost'}
							size="sm"
							class="h-7 px-2"
							aria-pressed={view === option.value}
							title={option.value === 'preview'
								? 'Vorschau mit direktem Bearbeiten'
								: option.value === 'split'
									? 'Formular und Vorschau nebeneinander'
									: 'Nur Formular'}
							onclick={() => setView(option.value as EditorView)}
							><option.icon aria-hidden="true" /><span class="hidden sm:inline">{option.label}</span
							></Button
						>
					{/each}
				</div>
			{:else}
				<Button
					variant={view === 'split' ? 'secondary' : 'ghost'}
					size="sm"
					onclick={() => setView(view === 'split' ? 'form' : 'split')}
					title="Live-Vorschau neben dem Editor"><EyeIcon aria-hidden="true" /> Vorschau</Button
				>
			{/if}
			<Button variant="ghost" size="sm" onclick={() => (historyOpen = true)}
				><HistoryIcon aria-hidden="true" /> Versionen <CountBadge count={versions.length} /></Button
			>
			<Button variant="outline" size="sm" onclick={() => save()} disabled={busy}
				><SaveIcon aria-hidden="true" /> Speichern</Button
			>
			{#if status === 'published'}
				<Button variant="secondary" size="sm" onclick={unpublish} disabled={busy}
					>Zurück auf Entwurf</Button
				>
			{:else}
				<Button size="sm" onclick={() => save('published')} disabled={busy}
					><GlobeIcon aria-hidden="true" /> Veröffentlichen</Button
				>
			{/if}
		</div>
	</div>

	<div class="flex flex-wrap gap-2">
		{#each languages as language (language.code)}
			{@const meta = langMeta.get(language.code)}
			<a
				href="/admin/{collection.name}/{doc.slug}?lang={language.code}"
				class="rounded-md border px-3 py-1.5 text-sm {language.code === lang
					? 'border-primary bg-primary/10 font-medium'
					: 'border-border hover:bg-accent'}"
			>
				{language.label}
				{#if !meta}<span class="text-muted-foreground"> · fehlt</span>
				{:else if meta.status === 'published'}<span class="text-green-700"> · live</span>
				{:else}<span class="text-amber-700"> · Entwurf</span>{/if}
			</a>
		{/each}
	</div>

	<div class="grid gap-6 {view === 'split' ? '2xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]' : ''}">
		<!-- Editor column -->
		<div class="min-w-0 space-y-8">
			{#if titleField}
				<div class="[&_input]:h-11 [&_input]:text-lg [&_input]:font-medium">
					<FieldEditor
						field={titleField}
						name={collection.titleField}
						value={fields[collection.titleField]}
						onchange={(titleValue) => setFields({ ...fields, [collection.titleField]: titleValue })}
						path={collection.titleField}
						{errors}
						{lang}
						{blockDefs}
					/>
				</div>
			{/if}

			{#if collection.blocks.length && !showForm}
				<div class="flex flex-wrap items-center justify-between gap-3">
					<p class="text-muted-foreground text-sm">
						Texte direkt in der Vorschau anklicken und tippen, Bilder anklicken zum Tauschen; ein
						Klick auf einen Block öffnet alle seine Felder.
					</p>
					{#if blockOptions.length}
						<SearchableSelect
							options={blockOptions}
							value={null}
							onSelect={addBlock}
							placeholder="Block hinzufügen"
							searchable={blockOptions.length > 6}
							ariaLabel="Block hinzufügen"
							align="end"
							triggerIcon={PlusIcon}
							class="bg-primary text-primary-foreground hover:bg-primary/90 dark:bg-primary dark:hover:bg-primary/90 w-auto border-transparent font-medium"
						/>
					{/if}
				</div>
			{/if}

			{#if collection.blocks.length && showForm}
				<section class="space-y-3">
					<div class="flex items-center justify-between">
						<h2 class="text-lg font-semibold">
							Inhalt <Badge variant="neutral" class="ms-2 align-middle">{blocks.length}</Badge>
						</h2>
						{#if blocks.length}
							{#if allExpanded}
								<Button variant="ghost" size="sm" onclick={() => (expandedBlocks = new Set())}
									><ChevronsDownUpIcon aria-hidden="true" /> Alle zuklappen</Button
								>
							{:else}
								<Button
									variant="ghost"
									size="sm"
									onclick={() => (expandedBlocks = new Set(blocks.map((block) => block.id)))}
									><ChevronsUpDownIcon aria-hidden="true" /> Alle aufklappen</Button
								>
							{/if}
						{/if}
					</div>
					<BlocksEditor
						{blocks}
						allowed={collection.blocks}
						{blockDefs}
						{lang}
						{errors}
						onchange={setBlocks}
						bind:expanded={expandedBlocks}
					/>
				</section>
			{/if}

			<!-- Settings (collapsed) -->
			{#if Object.keys(settingsFields).length}
				<section class="border-border rounded-lg border">
					<button
						type="button"
						class="flex w-full items-center gap-2 px-4 py-3 text-start"
						onclick={() => (settingsOpen = !settingsOpen)}
						aria-expanded={settingsOpen}
					>
						<Settings2Icon class="text-muted-foreground size-4" aria-hidden="true" />
						<span class="font-medium">Einstellungen</span>
						{#if settingsErrorCount}<Badge variant="signal"
								>{formatCount(settingsErrorCount, 'Problem', 'Probleme')}</Badge
							>{/if}
						<span class="text-muted-foreground ms-auto text-xs"
							>{formatCount(Object.keys(settingsFields).length, 'Feld', 'Felder')}</span
						>
						<ChevronDownIcon
							class="size-4 transition-transform {settingsOpen ? 'rotate-180' : ''}"
							aria-hidden="true"
						/>
					</button>
					{#if settingsOpen}
						<div class="border-border space-y-6 border-t p-4">
							<FieldsForm
								fields={settingsFields}
								value={fields}
								onchange={setFields}
								{errors}
								{lang}
								{blockDefs}
							/>
							<div class="border-border flex flex-wrap gap-2 border-t pt-4">
								{#if exists && doc.langs.length > 1}
									<Button variant="ghost" size="sm" onclick={() => (confirm = 'delete-lang')}
										><TrashIcon aria-hidden="true" /> Sprachfassung {lang.toUpperCase()} löschen</Button
									>
								{/if}
								<Button
									variant="ghost"
									size="sm"
									class="text-destructive"
									onclick={() => (confirm = 'delete-doc')}
									><TrashIcon aria-hidden="true" /> Dokument löschen</Button
								>
							</div>
						</div>
					{/if}
				</section>
			{/if}
		</div>

		<!-- Live preview renders the current unsaved state with the block renderer. -->
		{#if showPreview}
			<aside
				bind:this={previewPanel}
				class="min-w-0 scroll-mt-4 2xl:sticky 2xl:top-4 2xl:max-h-[calc(100vh-2rem)]"
			>
				<div
					class="border-border bg-background flex h-full flex-col overflow-hidden rounded-lg border"
				>
					<div class="border-border bg-muted/40 flex items-center gap-2 border-b px-3 py-2 text-xs">
						<span class="font-medium">Live-Vorschau</span>
						<span class="text-muted-foreground">{lang.toUpperCase()} · im Seitenlayout</span>
						{#if previewHref}
							<a
								href={previewHref}
								target="_blank"
								rel="noopener"
								class="text-primary ms-auto inline-flex items-center gap-1 hover:underline"
							>
								Gespeicherten Stand im Tab öffnen <ExternalLinkIcon
									class="size-3"
									aria-hidden="true"
								/>
							</a>
						{/if}
					</div>
					<iframe
						bind:this={previewFrame}
						src={previewFrameSrc}
						title="Live-Vorschau"
						class="w-full bg-white {view === 'preview'
							? 'h-[calc(100vh-7rem)] min-h-[32rem]'
							: 'h-[70vh] 2xl:h-[calc(100vh-6rem)]'}"
					></iframe>
				</div>
			</aside>
		{/if}
	</div>
</div>

<ConfirmDialog
	open={confirm !== null}
	title={confirm === 'delete-doc' ? 'Dokument löschen?' : 'Sprachfassung löschen?'}
	body={confirm === 'delete-doc'
		? `„${title}" wird in allen Sprachen entfernt. Die Versionshistorie bleibt erhalten.`
		: `Die Fassung ${lang.toUpperCase()} von „${title}" wird entfernt.`}
	confirmLabel="Löschen"
	cancelLabel="Abbrechen"
	destructive
	loading={busy}
	onConfirm={() => remove(confirm === 'delete-doc')}
	onCancel={() => (confirm = null)}
/>

<Sheet.Root
	open={sheetBlockId !== null && sheetIndex >= 0}
	onOpenChange={(open) => {
		if (!open) sheetBlockId = null;
	}}
>
	<Sheet.Content side="right" class="w-full overflow-y-auto sm:max-w-lg">
		{#if sheetIndex >= 0}
			{@const block = blocks[sheetIndex]}
			{@const definition = blockDefs[block.type]}
			<Sheet.Header>
				<Sheet.Title>{definition?.label ?? block.type}</Sheet.Title>
				<Sheet.Description>Änderungen erscheinen sofort in der Vorschau.</Sheet.Description>
			</Sheet.Header>
			<div class="space-y-6 px-4 pb-6">
				{#if definition}
					<FieldsForm
						fields={definition.fields}
						value={block.data}
						onchange={(data) => updateBlockData(block.id, data)}
						path={`blocks[${sheetIndex}].`}
						{errors}
						{lang}
						{blockDefs}
					/>
				{/if}
				<Button class="w-full" onclick={() => (sheetBlockId = null)}>Fertig</Button>
			</div>
		{/if}
	</Sheet.Content>
</Sheet.Root>

<MediaPicker bind:open={mediaOpen} accept={mediaAccept} onselect={pickMedia} />

<Sheet.Root bind:open={historyOpen}>
	<Sheet.Content side="right" class="w-full overflow-y-auto sm:max-w-md">
		<Sheet.Header>
			<Sheet.Title>Versionen</Sheet.Title>
			<Sheet.Description
				>Jeder Speichervorgang sichert den vorherigen Stand. Wiederherstellen legt selbst wieder
				eine Version an.</Sheet.Description
			>
		</Sheet.Header>
		<div class="space-y-2 px-4 pb-4">
			{#if versions.length === 0}
				<p class="text-muted-foreground text-sm">Noch keine Versionen.</p>
			{/if}
			{#each versions as version (version.id)}
				<div
					class="border-border flex flex-wrap items-center justify-between gap-2 rounded-md border p-2 text-sm"
				>
					<div class="min-w-0">
						<div>
							{formatDateTime(version.savedAt)}
							<Badge variant="id"
								>{version.part === 'base' ? 'Struktur' : version.part.toUpperCase()}</Badge
							>
						</div>
						<div class="text-muted-foreground text-xs">{version.savedBy}</div>
					</div>
					<Button
						size="sm"
						variant="outline"
						class="shrink-0"
						onclick={() => restore(version)}
						disabled={busy}>Wiederherstellen</Button
					>
				</div>
			{/each}
		</div>
	</Sheet.Content>
</Sheet.Root>
