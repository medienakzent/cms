<script lang="ts">
	import * as Card from '@compdata/ui/card';
	import ExternalLinkIcon from '@lucide/svelte/icons/external-link';
	import type { AnalyticsReport } from '../../server/analytics';
	import {
		formatCount,
		formatDate,
		formatDuration,
		formatNumber,
		formatPercent
	} from '../../format';
	import BarChart from './BarChart.svelte';
	import BreakdownList from './BreakdownList.svelte';

	type Props = { report: AnalyticsReport; enabled: boolean; periods: readonly number[] };

	let { report, enabled, periods }: Props = $props();

	const CHANNELS: Record<string, string> = {
		direct: 'Direkt',
		search: 'Suchmaschinen',
		social: 'Soziale Netzwerke',
		campaign: 'Kampagnen',
		referral: 'Verweise'
	};
	const DEVICES: Record<string, string> = {
		desktop: 'Desktop',
		mobile: 'Smartphone',
		tablet: 'Tablet'
	};
	const languageNames = new Intl.DisplayNames(['de'], { type: 'language' });
	const languageLabel = (code: string) => {
		try {
			return languageNames.of(code) ?? code;
		} catch {
			return code;
		}
	};
	const depthLabel = (label: string) => (label === '1' ? '1 Seite' : `${label} Seiten`);

	const pageHref = (path: string) =>
		`/admin/analytics?path=${encodeURIComponent(path)}${report.days === 30 ? '' : `&days=${report.days}`}`;
	const periodHref = (days: number) => {
		const parameters = new URLSearchParams();
		if (report.path) parameters.set('path', report.path);
		if (days !== 30) parameters.set('days', String(days));
		const query = parameters.toString();
		return `${report.path ? '/admin/analytics' : '/admin'}${query ? `?${query}` : ''}`;
	};
	const periodLabel = (days: number) =>
		days === 365 ? '12 Monate' : formatCount(days, 'Tag', 'Tage');

	const bounceRate = (bounces: number, base: number) => (base ? bounces / base : 0);

	type Kpi = {
		label: string;
		value: string;
		/** Relative change against the previous period; null when there is nothing to compare. */
		change: number | null;
		/** A falling value is good (bounce rate). */
		lowerIsBetter?: boolean;
		hint?: string;
	};
	const change = (current: number, previous: number) =>
		previous ? (current - previous) / previous : null;

	const kpis = $derived.by<Kpi[]>(() => {
		const totals = report.totals;
		const previous = report.previous;
		if (report.path)
			return [
				{
					label: 'Aufrufe',
					value: formatNumber(totals.views),
					change: change(totals.views, previous.views)
				},
				{
					label: 'Besuche',
					value: formatNumber(totals.sessions),
					change: change(totals.sessions, previous.sessions),
					hint: 'Besuche, in denen die Seite mindestens einmal aufgerufen wurde'
				},
				{
					label: 'Ø Verweildauer',
					value: formatDuration(totals.averageSeconds),
					change: change(totals.averageSeconds, previous.averageSeconds),
					hint: 'Sichtbare Zeit auf der Seite, ohne Tabs im Hintergrund'
				},
				{
					label: 'Einstiege',
					value: formatNumber(totals.entries),
					change: null,
					hint: 'Besuche, die auf dieser Seite begonnen haben'
				},
				{
					label: 'Ausstiege',
					value: formatNumber(totals.exits),
					change: null,
					hint: 'Besuche, die auf dieser Seite geendet haben'
				},
				{
					label: 'Absprungrate',
					value: formatPercent(totals.bounces, totals.entries),
					change: null,
					hint: 'Anteil der Einstiege ohne weiteren Seitenaufruf'
				}
			];
		return [
			{
				label: 'Seitenaufrufe',
				value: formatNumber(totals.views),
				change: change(totals.views, previous.views)
			},
			{
				label: 'Besuche',
				value: formatNumber(totals.sessions),
				change: change(totals.sessions, previous.sessions),
				hint: 'Ein Besuch endet nach 30 Minuten ohne Aufruf oder um Mitternacht'
			},
			{
				label: 'Seiten pro Besuch',
				value: totals.sessions ? formatNumber(totals.views / totals.sessions, 1) : '–',
				change: change(
					totals.sessions ? totals.views / totals.sessions : 0,
					previous.sessions ? previous.views / previous.sessions : 0
				)
			},
			{
				label: 'Ø Besuchsdauer',
				value: formatDuration(totals.averageSeconds),
				change: change(totals.averageSeconds, previous.averageSeconds),
				hint: 'Sichtbare Zeit auf allen Seiten eines Besuchs'
			},
			{
				label: 'Absprungrate',
				value: formatPercent(totals.bounces, totals.sessions),
				change: change(
					bounceRate(totals.bounces, totals.sessions),
					bounceRate(previous.bounces, previous.sessions)
				),
				lowerIsBetter: true,
				hint: 'Anteil der Besuche mit nur einer Seite'
			},
			{
				label: 'Jetzt aktiv',
				value: formatNumber(report.activeNow),
				change: null,
				hint: 'Besuche mit einem Seitenaufruf in den letzten fünf Minuten'
			}
		];
	});

	const shortDate = (day: string) =>
		new Date(`${day}T12:00:00Z`).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });

	const timelineBars = $derived(
		report.timeline.map((entry) => ({
			label: entry.day,
			value: entry.views,
			secondary: entry.sessions,
			title: `${formatDate(`${entry.day}T12:00:00Z`)}: ${formatCount(entry.views, 'Aufruf', 'Aufrufe')}, ${formatCount(entry.sessions, 'Besuch', 'Besuche')}`
		}))
	);
	const timelineAxis = $derived(
		report.timeline.length > 2
			? [
					shortDate(report.from),
					shortDate(report.timeline[Math.floor(report.timeline.length / 2)].day),
					shortDate(report.to)
				]
			: [shortDate(report.from), shortDate(report.to)]
	);
	const hourBars = $derived(
		report.hours.map((count, hour) => ({
			label: String(hour),
			value: count,
			title: `${hour}–${hour + 1} Uhr: ${formatCount(count, 'Aufruf', 'Aufrufe')}`
		}))
	);

	const pathRows = (rows: { label: string; count: number }[]) =>
		rows.map((row) => ({ ...row, href: pageHref(row.label) }));
</script>

<div class="space-y-4">
	<div class="flex flex-wrap items-center justify-between gap-3">
		{#if report.path}
			<h1 class="flex min-w-0 items-center gap-2 text-2xl font-semibold">
				<span class="truncate">Statistik <code class="text-xl">{report.path}</code></span>
				<a
					href={report.path}
					target="_blank"
					rel="noopener"
					class="text-muted-foreground hover:text-foreground"
					title="Seite öffnen"
					aria-label="Seite öffnen"><ExternalLinkIcon class="size-4" /></a
				>
			</h1>
		{:else}
			<h2 class="text-xl font-semibold">Besucher</h2>
		{/if}
		<nav class="flex flex-wrap gap-2 text-sm" aria-label="Zeitraum">
			{#each periods as days (days)}
				<a
					href={periodHref(days)}
					data-sveltekit-noscroll
					aria-current={report.days === days ? 'page' : undefined}
					class="rounded-md border px-2 py-1 {report.days === days
						? 'border-primary bg-primary/10'
						: 'border-border'}">{periodLabel(days)}</a
				>
			{/each}
		</nav>
	</div>

	{#if !enabled}
		<p class="text-muted-foreground text-sm">
			Die Besucherstatistik ist abgeschaltet (<code>ANALYTICS=0</code>).
		</p>
	{/if}

	<div class="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
		{#each kpis as kpi (kpi.label)}
			<Card.Root class="gap-1 px-4" title={kpi.hint}>
				<span class="text-muted-foreground text-sm">{kpi.label}</span>
				<span class="text-2xl font-semibold tabular-nums">{kpi.value}</span>
				{#if kpi.change !== null}
					{@const better = kpi.lowerIsBetter ? kpi.change < 0 : kpi.change > 0}
					<span
						class="text-xs {kpi.change === 0
							? 'text-muted-foreground'
							: better
								? 'text-green-600 dark:text-green-400'
								: 'text-red-600 dark:text-red-400'}"
						>{kpi.change > 0 ? '+' : ''}{formatNumber(kpi.change * 100)} % zum Vorzeitraum</span
					>
				{:else}
					<span class="text-xs">&nbsp;</span>
				{/if}
			</Card.Root>
		{/each}
	</div>

	{#if report.totals.views === 0}
		<p class="text-muted-foreground text-sm">
			Noch keine Aufrufe in diesem Zeitraum. Angemeldete Nutzer werden nicht gezählt — zum Testen
			die Website in einem privaten Fenster öffnen.
		</p>
	{:else}
		<Card.Root class="gap-3">
			<Card.Header class="flex flex-wrap items-center justify-between gap-2">
				<Card.Title class="text-base">Verlauf</Card.Title>
				<span class="text-muted-foreground flex gap-4 text-xs">
					<span class="flex items-center gap-1"
						><span class="bg-primary/25 inline-block size-3 rounded-sm"></span> Aufrufe</span
					>
					<span class="flex items-center gap-1"
						><span class="bg-primary inline-block size-3 rounded-sm"></span> Besuche</span
					>
				</span>
			</Card.Header>
			<Card.Content>
				<BarChart bars={timelineBars} axis={timelineAxis} />
			</Card.Content>
		</Card.Root>

		{#if report.path}
			<div class="grid gap-4 lg:grid-cols-2">
				<BreakdownList
					title="Kommt von (Seite)"
					rows={pathRows(report.cameFrom)}
					empty="Nur Einstiege von außen"
				/>
				<BreakdownList
					title="Geht weiter zu"
					rows={pathRows(report.wentTo)}
					empty="Kein weiterer Aufruf"
				/>
				<BreakdownList
					title="Herkunft der Einstiege"
					rows={report.channels}
					format={(label) => CHANNELS[label] ?? label}
				/>
				<BreakdownList title="Verweisende Websites" rows={report.referrers} />
			</div>
		{:else}
			<Card.Root class="gap-3">
				<Card.Header>
					<Card.Title class="text-base">Seiten</Card.Title>
				</Card.Header>
				<Card.Content class="overflow-x-auto">
					<table class="w-full text-sm">
						<thead class="text-muted-foreground text-left">
							<tr>
								<th class="py-1 pr-3 font-normal">Seite</th>
								<th class="py-1 pr-3 text-right font-normal">Aufrufe</th>
								<th class="py-1 pr-3 text-right font-normal">Besuche</th>
								<th class="py-1 text-right font-normal">Ø Verweildauer</th>
							</tr>
						</thead>
						<tbody>
							{#each report.pages as page (page.path)}
								<tr class="border-border border-t">
									<td class="max-w-0 truncate py-1.5 pr-3">
										<a href={pageHref(page.path)} class="hover:underline" title={page.path}
											>{page.path}</a
										>
									</td>
									<td class="py-1.5 pr-3 text-right tabular-nums">{formatNumber(page.views)}</td>
									<td class="py-1.5 pr-3 text-right tabular-nums">{formatNumber(page.sessions)}</td>
									<td class="py-1.5 text-right tabular-nums"
										>{page.averageSeconds ? formatDuration(page.averageSeconds) : '–'}</td
									>
								</tr>
							{/each}
						</tbody>
					</table>
				</Card.Content>
			</Card.Root>

			<div class="grid gap-4 lg:grid-cols-2">
				<BreakdownList
					title="Herkunft"
					rows={report.channels}
					format={(label) => CHANNELS[label] ?? label}
				/>
				<BreakdownList
					title="Verweisende Websites"
					rows={report.referrers}
					empty="Keine Verweise von anderen Websites"
				/>
				<BreakdownList title="Einstiegsseiten" rows={pathRows(report.entryPages)} />
				<BreakdownList title="Ausstiegsseiten" rows={pathRows(report.exitPages)} />
				<Card.Root class="gap-3">
					<Card.Header>
						<Card.Title class="text-base">Häufige Wege</Card.Title>
					</Card.Header>
					<Card.Content class="space-y-1 text-sm">
						{#each report.transitions as step (`${step.from}→${step.to}`)}
							<div class="flex items-center justify-between gap-3 px-2 py-1">
								<span class="min-w-0 truncate">
									<a href={pageHref(step.from)} class="hover:underline">{step.from}</a>
									<span class="text-muted-foreground">→</span>
									<a href={pageHref(step.to)} class="hover:underline">{step.to}</a>
								</span>
								<span class="text-muted-foreground shrink-0 tabular-nums"
									>{formatNumber(step.count)}</span
								>
							</div>
						{:else}
							<p class="text-muted-foreground px-2">Noch keine Wege über mehrere Seiten</p>
						{/each}
					</Card.Content>
				</Card.Root>
				<BreakdownList title="Besuchstiefe" rows={report.depth} format={depthLabel} />
				{#if report.campaigns.length}
					<BreakdownList title="Kampagnen (Quelle / Medium / Name)" rows={report.campaigns} />
				{/if}
			</div>
		{/if}

		<div class="grid gap-4 lg:grid-cols-2">
			<Card.Root class="gap-3">
				<Card.Header>
					<Card.Title class="text-base">Aufrufe nach Uhrzeit</Card.Title>
				</Card.Header>
				<Card.Content>
					<BarChart bars={hourBars} axis={['0 Uhr', '6', '12', '18', '23 Uhr']} height="h-28" />
				</Card.Content>
			</Card.Root>
			<BreakdownList
				title="Geräte"
				rows={report.devices}
				format={(label) => DEVICES[label] ?? label}
			/>
			<BreakdownList title="Browser" rows={report.browsers} />
			<BreakdownList title="Betriebssysteme" rows={report.systems} />
			<BreakdownList title="Sprachen" rows={report.languages} format={languageLabel} />
		</div>
	{/if}

	<p class="text-muted-foreground text-xs">
		Datenschutzfreundlich erfasst: ohne Cookies und ohne Speicher im Browser, IP-Adressen werden
		nicht gespeichert. Ein Besuch wird nur innerhalb eines Tages wiedererkannt. „Do Not Track“ wird
		beachtet, angemeldete Nutzer werden nicht gezählt.
	</p>
</div>
