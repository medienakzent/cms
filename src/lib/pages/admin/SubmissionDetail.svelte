<script lang="ts">
	import { formatDateTime } from '../../format';
	import { goto } from '$app/navigation';
	import { Badge } from '@compdata/ui/badge';
	import { Button } from '@compdata/ui/button';
	import { ConfirmDialog } from '@compdata/ui/confirm-dialog';
	import TrashIcon from '@lucide/svelte/icons/trash-2';
	import { toast } from 'svelte-sonner';
	import { apiFetch } from '../../admin/api-client';
	import type { load } from '../../routes/admin/submission';

	let { data }: { data: Awaited<ReturnType<typeof load>> } = $props();
	const submission = $derived(data.sub);

	let confirm = $state(false);
	let busy = $state(false);

	const variant = (status: string) =>
		status === 'sent' ? 'positive' : status === 'spam' ? 'neutral' : 'signal';
	const isFile = (value: unknown): value is { name: string; size: number; url: string } =>
		typeof value === 'object' && value !== null && 'url' in value && 'name' in value;
	const formatSize = (bytes: number) =>
		bytes > 1048576
			? `${(bytes / 1048576).toFixed(1)} MB`
			: `${Math.max(1, Math.round(bytes / 1024))} KB`;
	const text = (value: unknown) =>
		typeof value === 'boolean'
			? value
				? 'Ja'
				: 'Nein'
			: Array.isArray(value)
				? value.join(', ')
				: typeof value === 'object' && value !== null
					? JSON.stringify(value)
					: String(value ?? '');

	async function remove() {
		busy = true;
		try {
			await apiFetch(`/api/v1/submissions/${submission.id}`, { method: 'DELETE' });
			toast.success('Einsendung gelöscht');
			await goto('/admin/submissions');
		} catch (error) {
			toast.error((error as Error).message);
			busy = false;
			confirm = false;
		}
	}
</script>

<div class="mb-6 flex flex-wrap items-start justify-between gap-3">
	<div>
		<h1 class="text-2xl font-semibold">{submission.subject || data.templateLabel}</h1>
		<div class="text-muted-foreground mt-1 flex flex-wrap items-center gap-2 text-sm">
			<span>{formatDateTime(submission.sentAt, 'long')}</span>
			<Badge variant="id">{data.templateLabel}</Badge>
			<Badge variant={variant(submission.status)}>{submission.status}</Badge>
			<code class="text-xs">{submission.id}</code>
		</div>
	</div>
	<div class="flex gap-2">
		{#if submission.replyTo}<Button
				size="sm"
				variant="outline"
				href="mailto:{submission.replyTo}?subject=Re: {encodeURIComponent(submission.subject)}"
				>Antworten</Button
			>{/if}
		<Button size="sm" variant="ghost" class="text-destructive" onclick={() => (confirm = true)}
			><TrashIcon aria-hidden="true" /> Löschen</Button
		>
	</div>
</div>

<div class="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
	<section class="border-border rounded-lg border">
		<h2 class="border-border border-b px-4 py-3 font-medium">Angaben</h2>
		<dl class="divide-border divide-y">
			{#each Object.entries(submission.data) as [key, value] (key)}
				<div class="grid gap-1 px-4 py-3 md:grid-cols-[14rem_1fr]">
					<dt class="text-muted-foreground text-sm">{data.labels[key] ?? key}</dt>
					<dd class="text-sm whitespace-pre-wrap">
						{#if isFile(value)}
							<a href={value.url} class="text-primary underline" target="_blank" rel="noopener"
								>{value.name}</a
							>
							<span class="text-muted-foreground"> ({formatSize(value.size)})</span>
						{:else}
							{text(value) || '—'}
						{/if}
					</dd>
				</div>
			{/each}
		</dl>
	</section>

	<aside class="space-y-4">
		<section class="border-border rounded-lg border">
			<h2 class="border-border border-b px-4 py-3 font-medium">Versand</h2>
			<dl class="space-y-2 px-4 py-3 text-sm">
				<div>
					<dt class="text-muted-foreground">An</dt>
					<dd>{submission.to.join(', ') || '—'}</dd>
				</div>
				<div>
					<dt class="text-muted-foreground">Antwort an</dt>
					<dd>{submission.replyTo ?? '—'}</dd>
				</div>
				<div>
					<dt class="text-muted-foreground">Transport</dt>
					<dd>{submission.transport}</dd>
				</div>
				{#if submission.messageId}<div>
						<dt class="text-muted-foreground">Message-ID</dt>
						<dd class="break-all">{submission.messageId}</dd>
					</div>{/if}
				{#if submission.error}<div>
						<dt class="text-destructive">Fehler</dt>
						<dd class="text-destructive">{submission.error}</dd>
					</div>{/if}
			</dl>
		</section>
		<section class="border-border rounded-lg border">
			<h2 class="border-border border-b px-4 py-3 font-medium">Herkunft</h2>
			<dl class="space-y-2 px-4 py-3 text-sm">
				<div>
					<dt class="text-muted-foreground">Seite</dt>
					<dd class="break-all">{submission.meta.url || '—'}</dd>
				</div>
				<div>
					<dt class="text-muted-foreground">IP</dt>
					<dd>{submission.meta.ip || '—'}</dd>
				</div>
				<div>
					<dt class="text-muted-foreground">Browser</dt>
					<dd class="break-all">{submission.meta.userAgent || '—'}</dd>
				</div>
				<div>
					<dt class="text-muted-foreground">Sprache</dt>
					<dd>{submission.lang}</dd>
				</div>
			</dl>
		</section>
	</aside>
</div>

<ConfirmDialog
	open={confirm}
	title="Einsendung löschen?"
	body="Die Einsendung und alle hochgeladenen Dateien werden endgültig entfernt."
	confirmLabel="Löschen"
	cancelLabel="Abbrechen"
	destructive
	loading={busy}
	onConfirm={remove}
	onCancel={() => (confirm = false)}
/>
