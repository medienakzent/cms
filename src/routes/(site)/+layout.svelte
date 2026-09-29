<script lang="ts">
	import '../../app.css';
	import { page } from '$app/state';
	import { localizePath, setCmsContext } from '@compdata/cms';
	import registry from '../../cms';

	let { data, children } = $props();
	setCmsContext(registry);
	const config = registry.config;

	/** Gleiche Seite in anderer Sprache, sofern sie dort existiert. */
	const altLangs = $derived(
		config.languages.map((l) => {
			const available = (page.data.doc?.langs ?? []) as { lang: string; status: string }[];
			const exists = available.some((a) => a.lang === l.code && (a.status === 'published' || data.preview));
			const path = (page.data.docPath as string | undefined) ?? '/';
			return { ...l, href: localizePath(config, l.code, exists ? path : '/'), current: l.code === data.lang };
		})
	);
</script>

<svelte:head>
	<title>{page.data.title ? `${page.data.title} · ${data.siteName}` : data.siteName}</title>
</svelte:head>

<header class="border-border border-b">
	<div class="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-4">
		<a href={localizePath(config, data.lang, '/')} class="font-semibold">{data.siteName}</a>
		<nav class="flex items-center gap-4 text-sm">
			{#each data.nav as item (item.slug)}
				<a href={item.href} class="hover:text-primary">{item.title}</a>
			{/each}
			{#if config.languages.length > 1}
				<span class="text-muted-foreground flex gap-2 border-s ps-4">
					{#each altLangs as l (l.code)}
						<a href={l.href} hreflang={l.code} class={l.current ? 'font-medium' : ''}>{l.code.toUpperCase()}</a>
					{/each}
				</span>
			{/if}
			{#if data.preview}
				<a href="/admin" class="bg-primary text-primary-foreground rounded px-2 py-1 text-xs">Admin</a>
			{/if}
		</nav>
	</div>
</header>

<main>
	{@render children()}
</main>

<footer class="text-muted-foreground border-border mt-16 border-t py-8 text-center text-sm">{data.siteName}</footer>
