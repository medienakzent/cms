<script lang="ts">
	import { Badge } from '@compdata/ui/badge';
	import * as Table from '@compdata/ui/table';

	import type { load } from '../../routes/admin/mail';

	let { data }: { data: Awaited<ReturnType<typeof load>> } = $props();
	const fmt = (iso: string) => new Date(iso).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' });
	const variant = (s: string) => (s === 'sent' ? 'positive' : s === 'spam' ? 'neutral' : 'signal');
</script>

<div class="mb-4 flex flex-wrap items-center justify-between gap-3">
	<h1 class="text-2xl font-semibold">Anfragen <span class="text-muted-foreground text-base font-normal">({data.submissions.length})</span></h1>
	<div class="flex items-center gap-2 text-sm">
		<span class="text-muted-foreground">Versand: <code>{data.transport}</code></span>
		<a href="/admin/mail" class="rounded-md border px-2 py-1 {data.template ? 'border-border' : 'border-primary bg-primary/10'}">Alle</a>
		{#each data.templates as t (t.name)}
			<a href="/admin/mail?template={t.name}" class="rounded-md border px-2 py-1 {data.template === t.name ? 'border-primary bg-primary/10' : 'border-border'}">{t.label}</a>
		{/each}
	</div>
</div>

{#if data.submissions.length === 0}
	<p class="text-muted-foreground">Noch keine Anfragen.</p>
{:else}
	<Table.Table>
		<Table.TableHeader>
			<Table.TableRow>
				<Table.TableHead>Zeit</Table.TableHead>
				<Table.TableHead>Vorlage</Table.TableHead>
				<Table.TableHead>Absender</Table.TableHead>
				<Table.TableHead>Betreff</Table.TableHead>
				<Table.TableHead>Status</Table.TableHead>
			</Table.TableRow>
		</Table.TableHeader>
		<Table.TableBody>
			{#each data.submissions as s (s.id)}
				<Table.TableRow>
					<Table.TableCell class="whitespace-nowrap">{fmt(s.sentAt)}</Table.TableCell>
					<Table.TableCell>{s.template} <span class="text-muted-foreground text-xs">{s.lang.toUpperCase()}</span></Table.TableCell>
					<Table.TableCell>{s.replyTo ?? '—'}</Table.TableCell>
					<Table.TableCell>
						<details>
							<summary class="cursor-pointer">{s.subject || '—'}</summary>
							<dl class="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
								{#each Object.entries(s.data) as [k, v] (k)}
									<dt class="text-muted-foreground">{k}</dt>
									<dd class="whitespace-pre-wrap">
										{#if typeof v === 'object' && v !== null && 'url' in v}
											<a href={String(v.url)} class="text-primary underline" target="_blank" rel="noopener">{String((v as { name?: string }).name ?? 'Datei')}</a>
										{:else}{typeof v === 'string' ? v : JSON.stringify(v)}{/if}
									</dd>
								{/each}
								<dt class="text-muted-foreground">an</dt><dd>{s.to.join(', ')}</dd>
								{#if s.error}<dt class="text-destructive">Fehler</dt><dd class="text-destructive">{s.error}</dd>{/if}
							</dl>
						</details>
					</Table.TableCell>
					<Table.TableCell><Badge variant={variant(s.status)}>{s.status}</Badge></Table.TableCell>
				</Table.TableRow>
			{/each}
		</Table.TableBody>
	</Table.Table>
{/if}
