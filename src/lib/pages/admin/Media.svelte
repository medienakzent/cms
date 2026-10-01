<script lang="ts">
	import { contrastBackdrop } from '../../admin/thumbnail-tone';
	import { invalidateAll } from '$app/navigation';
	import { mediaUrl } from '../../media-url';
	import { formatCount } from '../../format';
	import type { MediaItem } from '../../types';
	import { apiFetch } from '../../admin/api-client';
	import type { load } from '../../routes/admin/media';
	import { Badge } from '@compdata/ui/badge';
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

	async function upload(event: Event) {
		const files = (event.currentTarget as HTMLInputElement).files;
		if (!files?.length) return;
		const form = new FormData();
		for (const file of files) form.append('file', file);
		uploading = true;
		try {
			const result = await apiFetch<{ items: MediaItem[] }>('/api/v1/media', {
				method: 'POST',
				body: form
			});
			toast.success(`${formatCount(result.items.length, 'Datei', 'Dateien')} hochgeladen`);
			await invalidateAll();
		} catch (error) {
			toast.error((error as Error).message);
		} finally {
			uploading = false;
			if (fileInput) fileInput.value = '';
		}
	}

	async function saveAlt(mediaItem: MediaItem, alt: string) {
		if (alt === mediaItem.alt) return;
		try {
			await apiFetch(`/api/v1/media/${mediaItem.id}`, { method: 'PATCH', json: { alt } });
			toast.success('Alternativtext gespeichert');
		} catch (error) {
			toast.error((error as Error).message);
		}
	}

	async function remove() {
		if (!toDelete) return;
		busy = true;
		try {
			await apiFetch(`/api/v1/media/${toDelete.id}`, { method: 'DELETE' });
			toast.success('Gelöscht');
			await invalidateAll();
		} catch (error) {
			toast.error((error as Error).message);
		} finally {
			busy = false;
			toDelete = null;
		}
	}

	function copyUrl(mediaItem: MediaItem) {
		navigator.clipboard.writeText(`${location.origin}${mediaUrl(mediaItem)}`);
		toast.success('URL kopiert');
	}

	const formatSize = (bytes: number) =>
		bytes > 1024 * 1024
			? `${(bytes / 1024 / 1024).toFixed(1)} MB`
			: `${Math.round(bytes / 1024)} KB`;
</script>

<div class="mb-6 flex flex-wrap items-center justify-between gap-3">
	<h1 class="text-2xl font-semibold">
		Medien <Badge variant="neutral" class="ms-2 align-middle">{data.media.total}</Badge>
	</h1>
	<div class="flex items-center gap-2">
		<form method="get">
			<Input type="search" name="q" value={data.q} placeholder="Suchen …" class="w-56" />
		</form>
		<input bind:this={fileInput} type="file" multiple class="hidden" onchange={upload} />
		<Button onclick={() => fileInput?.click()} disabled={uploading}
			><UploadIcon aria-hidden="true" /> {uploading ? 'Lädt hoch …' : 'Hochladen'}</Button
		>
	</div>
</div>

{#if data.media.items.length === 0}
	<p class="text-muted-foreground">Noch keine Medien.</p>
{/if}

<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
	{#each data.media.items as mediaItem (mediaItem.id)}
		<div class="border-border bg-card rounded-lg border p-3">
			{#if mediaItem.kind === 'image'}
				<img
					src={mediaUrl(mediaItem, 'md')}
					alt={mediaItem.alt}
					class="aspect-[4/3] w-full rounded object-cover"
					loading="lazy"
					use:contrastBackdrop
				/>
			{:else}
				<div
					class="bg-muted text-muted-foreground flex aspect-[4/3] items-center justify-center rounded text-sm"
				>
					{mediaItem.mime}
				</div>
			{/if}
			<div class="mt-2 truncate text-sm font-medium" title={mediaItem.originalName}>
				{mediaItem.originalName}
			</div>
			<div class="text-muted-foreground text-xs">
				{formatSize(mediaItem.size)}{#if mediaItem.width}
					· {mediaItem.width}×{mediaItem.height}{/if} · {new Date(
					mediaItem.createdAt
				).toLocaleDateString('de-DE')}
			</div>
			<Input
				class="mt-2"
				value={mediaItem.alt}
				placeholder="Alternativtext"
				onchange={(event) => saveAlt(mediaItem, event.currentTarget.value)}
			/>
			<div class="mt-2 flex gap-1">
				<Button size="sm" variant="ghost" onclick={() => copyUrl(mediaItem)}
					><CopyIcon aria-hidden="true" /> URL</Button
				>
				<Button
					size="sm"
					variant="ghost"
					class="text-destructive"
					onclick={() => (toDelete = mediaItem)}><TrashIcon aria-hidden="true" /> Löschen</Button
				>
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
