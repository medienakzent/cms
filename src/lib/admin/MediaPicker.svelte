<script lang="ts">
	import { contrastBackdrop } from './thumbnail-tone';
	import type { MediaItem, MediaRef } from '../types';
	import { mediaUrl } from '../media-url';
	import { apiFetch } from './api-client';
	import { Modal } from '@compdata/ui/modal';
	import { Button } from '@compdata/ui/button';
	import { Input } from '@compdata/ui/input';
	import { AsyncBlock } from '@compdata/ui/async-block';
	import UploadIcon from '@lucide/svelte/icons/upload';
	import { toast } from 'svelte-sonner';

	type Props = {
		open: boolean;
		accept: 'image' | 'video' | 'file' | 'any';
		onselect: (ref: MediaRef) => void;
	};

	let { open = $bindable(false), accept, onselect }: Props = $props();

	let items = $state<MediaItem[]>([]);
	let loading = $state(false);
	let error = $state<string | null>(null);
	let query = $state('');
	let uploading = $state(false);
	let fileInput = $state<HTMLInputElement | null>(null);

	const inputAccept = $derived(
		accept === 'image' ? 'image/*' : accept === 'video' ? 'video/*' : undefined
	);

	async function load() {
		loading = true;
		error = null;
		try {
			const kind = accept === 'any' ? '' : `&kind=${accept}`;
			const result = await apiFetch<{ items: MediaItem[] }>(
				`/api/v1/media?limit=200${kind}&q=${encodeURIComponent(query)}`
			);
			items = result.items;
		} catch (loadError) {
			error = (loadError as Error).message;
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		if (open) void load();
	});

	function toRef(mediaItem: MediaItem): MediaRef {
		return {
			id: mediaItem.id,
			src: mediaItem.src,
			mime: mediaItem.mime,
			kind: mediaItem.kind,
			width: mediaItem.width,
			height: mediaItem.height,
			alt: mediaItem.alt,
			variants: mediaItem.variants
		};
	}

	function choose(mediaItem: MediaItem) {
		onselect(toRef(mediaItem));
		open = false;
	}

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
			toast.success(`${result.items.length} Datei(en) hochgeladen`);
			if (result.items.length === 1) choose(result.items[0]);
			else await load();
		} catch (uploadError) {
			toast.error((uploadError as Error).message);
		} finally {
			uploading = false;
			if (fileInput) fileInput.value = '';
		}
	}
</script>

<Modal bind:open size="2xl" onCancel={() => (open = false)}>
	<header class="border-border flex items-center gap-3 border-b p-4">
		<h2 class="flex-1 text-lg font-semibold">Medien</h2>
		<Input
			type="search"
			placeholder="Suchen …"
			value={query}
			oninput={(event) => {
				query = event.currentTarget.value;
				void load();
			}}
			class="w-56"
		/>
		<input
			bind:this={fileInput}
			type="file"
			multiple
			accept={inputAccept}
			class="hidden"
			onchange={upload}
		/>
		<Button size="sm" onclick={() => fileInput?.click()} disabled={uploading}>
			<UploadIcon aria-hidden="true" />
			{uploading ? 'Lädt hoch …' : 'Hochladen'}
		</Button>
	</header>
	<div class="max-h-[70vh] flex-1 overflow-y-auto p-4">
		<AsyncBlock
			{loading}
			{error}
			empty={items.length === 0}
			loadingText="Lade Medien …"
			emptyText="Noch keine Medien — lade eine Datei hoch."
		>
			<div class="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
				{#each items as mediaItem (mediaItem.id)}
					<button
						type="button"
						class="group border-border hover:border-primary rounded-md border p-1 text-start"
						onclick={() => choose(mediaItem)}
					>
						{#if mediaItem.kind === 'image'}
							<img
								src={mediaUrl(mediaItem, 'thumb')}
								alt={mediaItem.alt}
								class="aspect-square w-full rounded object-cover"
								loading="lazy"
								use:contrastBackdrop
							/>
						{:else}
							<div
								class="bg-muted text-muted-foreground flex aspect-square items-center justify-center rounded text-xs"
							>
								{mediaItem.mime}
							</div>
						{/if}
						<div class="truncate px-1 pt-1 text-xs" title={mediaItem.originalName}>
							{mediaItem.originalName}
						</div>
					</button>
				{/each}
			</div>
		</AsyncBlock>
	</div>
</Modal>
