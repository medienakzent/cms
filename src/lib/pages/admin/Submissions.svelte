<script lang="ts">
	import { Badge } from '@compdata/ui/badge';
	import { Button } from '@compdata/ui/button';
	import * as Table from '@compdata/ui/table';
	import type { load } from '../../routes/admin/submissions';

	let { data }: { data: Awaited<ReturnType<typeof load>> } = $props();

	const fmt = (iso: string) => new Date(iso).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' });
	const variant = (s: string) => (s === 'sent' ? 'positive' : s === 'spam' ? 'neutral' : 'signal');
	const statusLabel: Record<string, string> = { all: 'Alle', sent: 'Gesendet', failed: 'Fehlgeschlagen', spam: 'Spam' };
	const href = (patch: Record<string, string | number>) => {
		const p = new URLSearchParams();
		const merged = { template: data.template, status: data.status, page: 1, ...patch };
		for (const [k, v] of Object.entries(merged)) if (v && v !== 'all' && v !== 1) p.set(k, String(v));
		const s = p.toString();
		return `/admin/submissions${s ? `?${s}` : ''}`;
	};
	/** Erste Textwerte als Kurzinfo der Zeile. */
	const preview = (d: Record<string, unknown>) =>
		Object.values(d)
			.filter((v): v is string => typeof v === 'string' && v.trim() !== '')
			.slice(0, 3)
			.join(' · ')
			.slice(0, 90);
</script>

<div class="mb-4 flex flex-wrap items-center justify-between gap-3">
	<h1 class="text-2xl font-semibold">Einsendungen <span class="text-muted-foreground text-base font-normal">({data.total})</span></h1>
	<span class="text-muted-foreground text-sm">Versand: <code>{data.transport}</code></span>
</div>

<div class="mb-4 flex flex-wrap items-center gap-2 text-sm">
	<a href={href({ template: '' })} class="rounded-md border px-2 py-1 {data.template ? 'border-border' : 'border-primary bg-primary/10'}">Alle Formulare</a>
	{#each data.templates as t (t.name)}
		<a href={href({ template: t.name })} class="rounded-md border px-2 py-1 {data.template === t.name ? 'border-primary bg-primary/10' : 'border-border'}">{t.label}</a>
	{/each}
	<span class="bg-border mx-1 h-5 w-px"></span>
	{#each Object.entries(statusLabel) as [key, label] (key)}
		<a href={href({ status: key })} class="rounded-md border px-2 py-1 {data.status === key ? 'border-primary bg-primary/10' : 'border-border'}">{label}</a>
	{/each}
</div>

{#if data.items.length === 0}
	<p class="text-muted-foreground">Keine Einsendungen.</p>
{:else}
	<Table.Table>
		<Table.TableHeader>
			<Table.TableRow>
				<Table.TableHead>Zeit</Table.TableHead>
				<Table.TableHead>Formular</Table.TableHead>
				<Table.TableHead>Absender</Table.TableHead>
				<Table.TableHead>Inhalt</Table.TableHead>
				<Table.TableHead>Status</Table.TableHead>
			</Table.TableRow>
		</Table.TableHeader>
		<Table.TableBody>
			{#each data.items as s (s.id)}
				<Table.TableRow>
					<Table.TableCell class="whitespace-nowrap"><a href="/admin/submissions/{s.id}" class="font-medium hover:underline">{fmt(s.sentAt)}</a></Table.TableCell>
					<Table.TableCell>{data.templates.find((t) => t.name === s.template)?.label ?? s.template}</Table.TableCell>
					<Table.TableCell>{s.replyTo ?? '—'}</Table.TableCell>
					<Table.TableCell class="text-muted-foreground max-w-md truncate">{s.subject || preview(s.data)}</Table.TableCell>
					<Table.TableCell><Badge variant={variant(s.status)}>{statusLabel[s.status] ?? s.status}</Badge></Table.TableCell>
				</Table.TableRow>
			{/each}
		</Table.TableBody>
	</Table.Table>
	{#if data.pages > 1}
		<div class="mt-4 flex items-center gap-2 text-sm">
			<Button size="sm" variant="outline" href={href({ page: data.page - 1 })} disabled={data.page <= 1}>Zurück</Button>
			<span class="text-muted-foreground">Seite {data.page} von {data.pages}</span>
			<Button size="sm" variant="outline" href={href({ page: data.page + 1 })} disabled={data.page >= data.pages}>Weiter</Button>
		</div>
	{/if}
{/if}
