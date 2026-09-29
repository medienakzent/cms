<script lang="ts">
	import '../../app.css';
	import { page } from '$app/state';
	import { localizePath, setCmsContext } from '@medienakzent/cms';
	import { Consent, openConsent } from '@medienakzent/cms/forms';
	import registry from '../../cms';

	let { data, children } = $props();
	setCmsContext(registry);
	const config = registry.config;

	/** Same page in each other language, falling back to home where it does not exist. */
	const altLangs = $derived(
		config.languages.map((language) => {
			const availableLanguages = (page.data.doc?.langs ?? []) as { lang: string; status: string }[];
			const exists = availableLanguages.some(
				(entry) => entry.lang === language.code && (entry.status === 'published' || data.preview)
			);
			const path = (page.data.docPath as string | undefined) ?? '/';
			return {
				...language,
				href: localizePath(config, language.code, exists ? path : '/'),
				current: language.code === data.lang
			};
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
					{#each altLangs as language (language.code)}
						<a
							href={language.href}
							hreflang={language.code}
							class={language.current ? 'font-medium' : ''}>{language.code.toUpperCase()}</a
						>
					{/each}
				</span>
			{/if}
			{#if data.preview}
				<a href="/admin" class="bg-primary text-primary-foreground rounded px-2 py-1 text-xs"
					>Admin</a
				>
			{/if}
		</nav>
	</div>
</header>

<main>
	{@render children()}
</main>

<footer class="text-muted-foreground border-border mt-16 border-t py-8 text-center text-sm">
	{data.siteName}
	{#if config.consent}
		· <button type="button" class="underline" onclick={openConsent}
			>Datenschutz-Einstellungen</button
		>
	{/if}
</footer>

<!-- Consent banner: only shown when cms.config.ts lists optional services. -->
<Consent config={config.consent} lang={data.lang} />
