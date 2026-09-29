<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { mediaUrl } from '../../media-url';
	import type { MediaItem } from '../../types';
	import { apiFetch } from '../../admin/api-client';
	import type { load } from '../../routes/admin/media';
	import { Button } from '@compdata/ui/button';
	import { Input } from '@compdata/ui/input';
	import { ConfirmDialog } from '@compdata/ui/confirm-dialog';
	import UploadIcon from '@lucide/svelte/icons/upload';
	import TrashIcon from '@lucide/svelte/icons/trash-2';
	import CopyIcon from '@lucide/svelte/icons/copy';
	import { toast } from 'svelte-sonner';

	let { data }: { data: Awaited<ReturnType<typeof load>> } = $props();

	let fileInput = $state<HTMLInputElement | null>(null);
	let uploading = $state(false);
	let toDelete = $state<MediaItem | null>(null);
	let busy = $state(false);

	async function upload(e: Event) {
		const files = (e.currentTarget as HTMLInputElement).files;
		if (!files?.length) return;
		const form = new FormData();
		for (const f of files) form.append('file', f);
		uploading = true;
		try {
			const r = await apiFetch<{ items: MediaItem[] }>('/api/v1/media', { method: 'POST', body: form });
			toast.success(`${r.items.length} Datei(en) hochgeladen`);
			await invalidateAll();
		} catch (err) {
			toast.error((err as Error).message);
		} finally {
			uploading = false;
			if (fileInput) fileInput.value = '';
		}
	}

	async function saveAlt(m: MediaItem, alt: string) {
		if (alt === m.alt) return;
		try {
			await apiFetch(`/api/v1/media/${m.id}`, { method: 'PATCH', json: { alt } });
			toast.success('Alternativtext gespeichert');
		} catch (err) {
			toast.error((err as Error).message);
		}
	}

	async function remove() {
		if (!toDelete) return;
		busy = true;
		try {
			await apiFetch(`/api/v1/media/${toDelete.id}`, { method: 'DELETE' });
			toast.success('Gelöscht');
			await invalidateAll();
		} catch (err) {
			toast.error((err as Error).message);
		} finally {
			busy = false;
			toDelete = null;
		}
	}

	function copyUrl(m: MediaItem) {
		navigator.clipboard.writeText(`${location.origin}${mediaUrl(m)}`);
		toast.success('URL kopiert');
	}

	const fmtSize = (n: number) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`);
</script>

<div class="mb-6 flex flex-wrap items-center justify-between gap-3">
	<h1 class="text-2xl font-semibold">Medien <span class="text-muted-foreground text-base font-normal">({data.media.total})</span></h1>
	<div class="flex items-center gap-2">
		<form method="get"><Input type="search" name="q" value={data.q} placeholder="Suchen …" class="w-56" /></form>
		<input bind:this={fileInput} type="file" multiple class="hidden" onchange={upload} />
		<Button onclick={() => fileInput?.click()} disabled={uploading}><UploadIcon aria-hidden="true" /> {uploading ? 'Lädt hoch …' : 'Hochladen'}</Button>
	</div>
</div>

{#if data.media.items.length === 0}
	<p class="text-muted-foreground">Noch keine Medien.</p>
{/if}

<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
	{#each data.media.items as m (m.id)}
		<div class="border-border bg-card rounded-lg border p-3">
			{#if m.kind === 'image'}
				<img src={mediaUrl(m, 'md')} alt={m.alt} class="aspect-[4/3] w-full rounded object-cover" loading="lazy" />
			{:else}
				<div class="bg-muted text-muted-foreground flex aspect-[4/3] items-center justify-center rounded text-sm">{m.mime}</div>
			{/if}
			<div class="mt-2 truncate text-sm font-medium" title={m.originalName}>{m.originalName}</div>
			<div class="text-muted-foreground text-xs">{fmtSize(m.size)}{#if m.width} · {m.width}×{m.height}{/if} · {new Date(m.createdAt).toLocaleDateString('de-DE')}</div>
			<Input class="mt-2" value={m.alt} placeholder="Alternativtext" onchange={(e) => saveAlt(m, e.currentTarget.value)} />
			<div class="mt-2 flex gap-1">
				<Button size="sm" variant="ghost" onclick={() => copyUrl(m)}><CopyIcon aria-hidden="true" /> URL</Button>
				<Button size="sm" variant="ghost" class="text-destructive" onclick={() => (toDelete = m)}><TrashIcon aria-hidden="true" /> Löschen</Button>
			</div>
		</div>
	{/each}
</div>

<ConfirmDialog
	open={toDelete !== null}
	title="Datei löschen?"
	body={`„${toDelete?.originalName ?? ''}" wird endgültig entfernt. Verweise in Inhalten zeigen dann ins Leere.`}
	confirmLabel="Löschen"
	cancelLabel="Abbrechen"
	destructive
	loading={busy}
	onConfirm={remove}
	onCancel={() => (toDelete = null)}
/>
