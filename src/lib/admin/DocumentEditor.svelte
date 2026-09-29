<script lang="ts">
	import { beforeNavigate, goto, invalidateAll } from '$app/navigation';
	import type { Document, DocumentStatus, RenderBlock, VersionInfo } from '../types';
	import type { LanguageConfig } from '../config';
	import type { AdminBlock, AdminCollection } from './types';
	import { apiFetch, ApiError, issuesToMap } from './api-client';
	import FieldsForm from './FieldsForm.svelte';
	import FieldEditor from './FieldEditor.svelte';
	import BlocksEditor from './BlocksEditor.svelte';
	import BlockRenderer from '../render/BlockRenderer.svelte';
	import type { FieldMap } from '../fields';
	import { Button } from '@compdata/ui/button';
	import { Badge } from '@compdata/ui/badge';
	import { ConfirmDialog } from '@compdata/ui/confirm-dialog';
	import * as Sheet from '@compdata/ui/sheet';
	import SaveIcon from '@lucide/svelte/icons/save';
	import GlobeIcon from '@lucide/svelte/icons/globe';
	import HistoryIcon from '@lucide/svelte/icons/history';
	import TrashIcon from '@lucide/svelte/icons/trash-2';
	import EyeIcon from '@lucide/svelte/icons/eye';
	import EyeOffIcon from '@lucide/svelte/icons/eye-off';
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
		/** Existiert die Sprachfassung bereits im Storage? */
		exists: boolean;
		lang: string;
		languages: LanguageConfig[];
		versions: VersionInfo[];
		previewHref: string | null;
	};

	let { collection, blockDefs, doc, exists, lang, languages, versions, previewHref }: Props =
		$props();

	// Initialwerte bewusst einmalig übernommen — die Seite remountet den Editor per {#key}.
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
	const allExpanded = $derived(blocks.length > 0 && blocks.every((b) => expandedBlocks.has(b.id)));
	let preview = $state(false);

	const PREVIEW_KEY = 'cms.editor.preview';
	$effect(() => {
		try {
			preview = localStorage.getItem(PREVIEW_KEY) === '1';
		} catch {
			/* Speicher nicht verfügbar */
		}
	});
	function togglePreview() {
		preview = !preview;
		try {
			localStorage.setItem(PREVIEW_KEY, preview ? '1' : '0');
		} catch {
			/* ignorieren */
		}
	}

	/** Einstellungen = alle Felder außer dem Titel; der steht prominent oben. */
	const settingsFields = $derived(
		Object.fromEntries(
			Object.entries(collection.fields).filter(([k]) => k !== collection.titleField)
		) as FieldMap
	);
	const titleField = $derived(collection.fields[collection.titleField]);
	const settingsErrorCount = $derived(
		Object.keys(errors).filter(
			(k) => !k.startsWith('blocks') && !k.startsWith(collection.titleField)
		).length
	);

	const base = $derived(`/api/v1/${collection.name}/${doc.slug}`);
	const title = $derived(String(fields[collection.titleField] ?? '') || doc.slug);
	const langMeta = $derived(new Map(doc.langs.map((l) => [l.lang, l])));

	beforeNavigate((nav) => {
		if (!dirty || confirm) return;
		// Beim Verlassen der Seite (Reload, Tab schließen) zeigt der Browser den nativen Hinweis;
		// ein eigenes confirm() ist dort blockiert.
		if (nav.willUnload) {
			nav.cancel();
			return;
		}
		if (!window.confirm('Ungespeicherte Änderungen verwerfen?')) nav.cancel();
	});

	function setFields(v: Record<string, unknown>) {
		fields = v;
		dirty = true;
	}
	function setBlocks(v: RenderBlock[]) {
		blocks = v;
		dirty = true;
	}

	async function save(nextStatus?: DocumentStatus) {
		busy = true;
		errors = {};
		try {
			const saved = await apiFetch<Document>(`${base}?lang=${lang}`, {
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
		} catch (e) {
			if (e instanceof ApiError && e.status === 422) {
				errors = issuesToMap(e.issues);
				toast.error(`${e.issues.length} Problem(e) — bitte Felder prüfen`);
			} else toast.error((e as Error).message);
		} finally {
			busy = false;
		}
	}

	async function unpublish() {
		busy = true;
		try {
			await apiFetch(`${base}/status`, { method: 'POST', json: { lang, status: 'draft' } });
			status = 'draft';
			toast.success('Auf Entwurf gesetzt');
			await invalidateAll();
		} catch (e) {
			toast.error((e as Error).message);
		} finally {
			busy = false;
		}
	}

	async function remove(whole: boolean) {
		busy = true;
		try {
			await apiFetch(whole ? base : `${base}?lang=${lang}`, { method: 'DELETE' });
			dirty = false;
			toast.success(whole ? 'Dokument gelöscht' : `Sprachfassung ${lang.toUpperCase()} gelöscht`);
			await goto(`/admin/${collection.name}`);
		} catch (e) {
			toast.error((e as Error).message);
			busy = false;
		} finally {
			confirm = null;
		}
	}

	async function restore(v: VersionInfo) {
		busy = true;
		try {
			await apiFetch(`${base}/versions/${v.id}/restore`, { method: 'POST' });
			toast.success('Version wiederhergestellt');
			historyOpen = false;
			dirty = false;
			await invalidateAll();
			window.location.reload();
		} catch (e) {
			toast.error((e as Error).message);
			busy = false;
		}
	}

	const fmt = (iso: string) =>
		new Date(iso).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' });
</script>

<div class="space-y-6">
	<!-- Kopfzeile -->
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
			<Button
				variant={preview ? 'secondary' : 'ghost'}
				size="sm"
				onclick={togglePreview}
				title="Live-Vorschau neben dem Editor"
			>
				{#if preview}<EyeOffIcon aria-hidden="true" />{:else}<EyeIcon aria-hidden="true" />{/if} Vorschau
			</Button>
			<Button variant="ghost" size="sm" onclick={() => (historyOpen = true)}
				><HistoryIcon aria-hidden="true" /> Versionen ({versions.length})</Button
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

	<!-- Sprachen -->
	<div class="flex flex-wrap gap-2">
		{#each languages as l (l.code)}
			{@const meta = langMeta.get(l.code)}
			<a
				href="/admin/{collection.name}/{doc.slug}?lang={l.code}"
				class="rounded-md border px-3 py-1.5 text-sm {l.code === lang
					? 'border-primary bg-primary/10 font-medium'
					: 'border-border hover:bg-accent'}"
			>
				{l.label}
				{#if !meta}<span class="text-muted-foreground"> · fehlt</span>
				{:else if meta.status === 'published'}<span class="text-green-700"> · live</span>
				{:else}<span class="text-amber-700"> · Entwurf</span>{/if}
			</a>
		{/each}
	</div>

	<div class="grid gap-6 {preview ? '2xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]' : ''}">
		<!-- Editor-Spalte -->
		<div class="min-w-0 space-y-8">
			<!-- Titel -->
			{#if titleField}
				<div class="[&_input]:h-11 [&_input]:text-lg [&_input]:font-medium">
					<FieldEditor
						field={titleField}
						name={collection.titleField}
						value={fields[collection.titleField]}
						onchange={(v) => setFields({ ...fields, [collection.titleField]: v })}
						path={collection.titleField}
						{errors}
						{lang}
						{blockDefs}
					/>
				</div>
			{/if}

			<!-- Blocks -->
			{#if collection.blocks.length}
				<section class="space-y-3">
					<div class="flex items-center justify-between">
						<h2 class="text-lg font-semibold">
							Inhalt <span class="text-muted-foreground text-sm font-normal">({blocks.length})</span
							>
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
									onclick={() => (expandedBlocks = new Set(blocks.map((b) => b.id)))}
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

			<!-- Einstellungen (eingeklappt) -->
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
						{#if settingsErrorCount}<Badge variant="signal">{settingsErrorCount} Problem(e)</Badge
							>{/if}
						<span class="text-muted-foreground ms-auto text-xs"
							>{Object.keys(settingsFields).length} Felder</span
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

		<!-- Live-Vorschau: rendert den aktuellen Zustand direkt mit dem Block-Renderer, ohne Speichern. -->
		{#if preview}
			<aside class="min-w-0 2xl:sticky 2xl:top-4 2xl:max-h-[calc(100vh-2rem)]">
				<div
					class="border-border bg-background flex h-full flex-col overflow-hidden rounded-lg border"
				>
					<div class="border-border bg-muted/40 flex items-center gap-2 border-b px-3 py-2 text-xs">
						<span class="font-medium">Live-Vorschau</span>
						<span class="text-muted-foreground">{lang.toUpperCase()} · ohne Seitenrahmen</span>
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
					<div class="overflow-auto">
						{#if blocks.length}
							<BlockRenderer {blocks} />
						{:else}
							<p class="text-muted-foreground p-8 text-center text-sm">Noch keine Blocks.</p>
						{/if}
					</div>
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

<Sheet.Root bind:open={historyOpen}>
	<Sheet.Content side="right">
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
			{#each versions as v (v.id)}
				<div
					class="border-border flex items-center justify-between gap-2 rounded-md border p-2 text-sm"
				>
					<div>
						<div>
							{fmt(v.savedAt)}
							<Badge variant="id">{v.part === 'base' ? 'Struktur' : v.part.toUpperCase()}</Badge>
						</div>
						<div class="text-muted-foreground text-xs">{v.savedBy}</div>
					</div>
					<Button size="sm" variant="outline" onclick={() => restore(v)} disabled={busy}
						>Wiederherstellen</Button
					>
				</div>
			{/each}
		</div>
	</Sheet.Content>
</Sheet.Root>
