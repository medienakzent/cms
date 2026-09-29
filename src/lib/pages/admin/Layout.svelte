<script lang="ts">
	import { page } from '$app/state';
	import { ModeWatcher, toggleMode, mode } from 'mode-watcher';
	import { AppShell } from '@compdata/ui/app-shell';
	import type { AppShellBreadcrumb } from '@compdata/ui/app-shell';
	import { Button } from '@compdata/ui/button';
	import { Toaster } from '@compdata/ui/sonner';
	import SunIcon from '@lucide/svelte/icons/sun';
	import MoonIcon from '@lucide/svelte/icons/moon';
	import type { Snippet } from 'svelte';
	import AdminSidebar from '../../admin/AdminSidebar.svelte';
	import { setCmsContext } from '../../context';
	import type { Registry } from '../../registry';
	import type { AdminLayoutData } from '../../routes/admin/layout';

	let { data, children, registry }: { data: AdminLayoutData; children: Snippet; registry: Registry } = $props();
	// Registry ist für die Lebensdauer der App konstant.
	// svelte-ignore state_referenced_locally
	setCmsContext(registry);

	const breadcrumbs = $derived<AppShellBreadcrumb[]>(
		(page.data.breadcrumbs as AppShellBreadcrumb[] | undefined) ?? [{ label: 'Übersicht', href: '/admin' }]
	);
</script>

<ModeWatcher />

<svelte:head>
	<title>{breadcrumbs.at(-1)?.label ?? 'Admin'} · {data.siteName} CMS</title>
</svelte:head>

{#if !data.user}
	{@render children()}
{:else}
	<AppShell {breadcrumbs} navButtons={false} showLogo={false}>
		{#snippet sidebar()}
			{#if data.user}
				<AdminSidebar collections={data.collections} pathname={page.url.pathname} user={data.user} siteName={data.siteName} />
			{/if}
		{/snippet}
		{#snippet headerEnd()}
			<Button size="icon-sm" variant="ghost" onclick={toggleMode} aria-label="Design umschalten">
				{#if mode.current === 'dark'}<SunIcon aria-hidden="true" />{:else}<MoonIcon aria-hidden="true" />{/if}
			</Button>
		{/snippet}
		<div class="w-full p-4 md:p-6">
			{@render children()}
		</div>
		{#snippet insetEnd()}
			<Toaster position="bottom-right" richColors closeButton />
		{/snippet}
	</AppShell>
{/if}
