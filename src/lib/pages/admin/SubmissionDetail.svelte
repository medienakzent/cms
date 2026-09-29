<script lang="ts">
	import { goto } from '$app/navigation';
	import { Badge } from '@compdata/ui/badge';
	import { Button } from '@compdata/ui/button';
	import { ConfirmDialog } from '@compdata/ui/confirm-dialog';
	import TrashIcon from '@lucide/svelte/icons/trash-2';
	import { toast } from 'svelte-sonner';
	import { apiFetch } from '../../admin/api-client';
	import type { load } from '../../routes/admin/submission';

	let { data }: { data: Awaited<ReturnType<typeof load>> } = $props();
	const s = $derived(data.sub);

	let confirm = $state(false);
	let busy = $state(false);

	const fmt = (iso: string) =>
		new Date(iso).toLocaleString('de-DE', { dateStyle: 'long', timeStyle: 'short' });
	const variant = (st: string) =>
		st === 'sent' ? 'positive' : st === 'spam' ? 'neutral' : 'signal';
	const isFile = (v: unknown): v is { name: string; size: number; url: string } =>
		typeof v === 'object' && v !== null && 'url' in v && 'name' in v;
	const fmtSize = (n: number) =>
		n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;
	const text = (v: unknown) =>
		typeof v === 'boolean'
			? v
				? 'Ja'
				: 'Nein'
			: Array.isArray(v)
				? v.join(', ')
				: typeof v === 'object' && v !== null
					? JSON.stringify(v)
					: String(v ?? '');

	async function remove() {
		busy = true;
		try {
			await apiFetch(`/api/v1/submissions/${s.id}`, { method: 'DELETE' });
			toast.success('Einsendung gelöscht');
			await goto('/admin/submissions');
		} catch (e) {
			toast.error((e as Error).message);
			busy = false;
			confirm = false;
		}
	}
</script>

<div class="mb-6 flex flex-wrap items-start justify-between gap-3">
	<div>
		<h1 class="text-2xl font-semibold">{s.subject || data.templateLabel}</h1>
		<div class="text-muted-foreground mt-1 flex flex-wrap items-center gap-2 text-sm">
			<span>{fmt(s.sentAt)}</span>
			<Badge variant="id">{data.templateLabel}</Badge>
			<Badge variant={variant(s.status)}>{s.status}</Badge>
			<code class="text-xs">{s.id}</code>
		</div>
	</div>
	<div class="flex gap-2">
		{#if s.replyTo}<Button
				size="sm"
				variant="outline"
				href="mailto:{s.replyTo}?subject=Re: {encodeURIComponent(s.subject)}">Antworten</Button
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
			{#each Object.entries(s.data) as [key, value] (key)}
				<div class="grid gap-1 px-4 py-3 md:grid-cols-[14rem_1fr]">
					<dt class="text-muted-foreground text-sm">{data.labels[key] ?? key}</dt>
					<dd class="text-sm whitespace-pre-wrap">
						{#if isFile(value)}
							<a href={value.url} class="text-primary underline" target="_blank" rel="noopener"
								>{value.name}</a
							>
							<span class="text-muted-foreground"> ({fmtSize(value.size)})</span>
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
					<dd>{s.to.join(', ') || '—'}</dd>
				</div>
				<div>
					<dt class="text-muted-foreground">Antwort an</dt>
					<dd>{s.replyTo ?? '—'}</dd>
				</div>
				<div>
					<dt class="text-muted-foreground">Transport</dt>
					<dd>{s.transport}</dd>
				</div>
				{#if s.messageId}<div>
						<dt class="text-muted-foreground">Message-ID</dt>
						<dd class="break-all">{s.messageId}</dd>
					</div>{/if}
				{#if s.error}<div>
						<dt class="text-destructive">Fehler</dt>
						<dd class="text-destructive">{s.error}</dd>
					</div>{/if}
			</dl>
		</section>
		<section class="border-border rounded-lg border">
			<h2 class="border-border border-b px-4 py-3 font-medium">Herkunft</h2>
			<dl class="space-y-2 px-4 py-3 text-sm">
				<div>
					<dt class="text-muted-foreground">Seite</dt>
					<dd class="break-all">{s.meta.url || '—'}</dd>
				</div>
				<div>
					<dt class="text-muted-foreground">IP</dt>
					<dd>{s.meta.ip || '—'}</dd>
				</div>
				<div>
					<dt class="text-muted-foreground">Browser</dt>
					<dd class="break-all">{s.meta.userAgent || '—'}</dd>
				</div>
				<div>
					<dt class="text-muted-foreground">Sprache</dt>
					<dd>{s.lang}</dd>
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
