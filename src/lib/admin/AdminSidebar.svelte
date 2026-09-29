<script lang="ts">
	import { AppShellSidebar } from '@compdata/ui/app-shell';
	import type { ShellNavItem } from '@compdata/ui/app-shell';
	import { iconFor } from './icons';
	import type { AdminCollection } from './types';
	import LayoutDashboardIcon from '@lucide/svelte/icons/layout-dashboard';
	import ImagesIcon from '@lucide/svelte/icons/images';
	import InboxIcon from '@lucide/svelte/icons/inbox';
	import UsersIcon from '@lucide/svelte/icons/users';
	import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';
	import LayersIcon from '@lucide/svelte/icons/layers';
	import { authClient } from './auth-client';
	import { apiFetch } from './api-client';
	import { toast } from 'svelte-sonner';

	type Props = {
		collections: AdminCollection[];
		pathname: string;
		user: { name: string; email: string; image: string; role: string };
		siteName: string;
	};

	let { collections, pathname, user, siteName }: Props = $props();

	const navMain = $derived<ShellNavItem[]>([
		{ id: 'dashboard', href: '/admin', label: 'Übersicht', icon: LayoutDashboardIcon },
		...collections.map((collection) => ({
			id: collection.name,
			href: `/admin/${collection.name}`,
			label: collection.labelPlural,
			icon: iconFor(collection.icon)
		})),
		{ id: 'media', href: '/admin/media', label: 'Medien', icon: ImagesIcon },
		{ id: 'submissions', href: '/admin/submissions', label: 'Einsendungen', icon: InboxIcon },
		...(user.role === 'admin'
			? [{ id: 'users', href: '/admin/users', label: 'Nutzer', icon: UsersIcon }]
			: [])
	]);

	const navSecondary = $derived<ShellNavItem[]>([
		{ id: 'site', href: '/', label: 'Website', icon: LayersIcon, external: true },
		...(user.role === 'admin'
			? [
					{
						id: 'reindex',
						href: '#',
						label: 'Index neu aufbauen',
						icon: RefreshCwIcon,
						onClick: reindex
					}
				]
			: [])
	]);

	async function reindex() {
		try {
			const result = await apiFetch<{ documents: number; media: number }>('/api/v1/reindex', {
				method: 'POST'
			});
			toast.success(`Index: ${result.documents} Dokumente, ${result.media} Medien`);
		} catch (error) {
			toast.error((error as Error).message);
		}
	}

	async function logout() {
		await authClient.signOut();
		window.location.href = '/admin/login';
	}
</script>

<AppShellSidebar
	variant="inset"
	collapsible="icon"
	{navMain}
	{navSecondary}
	{pathname}
	user={{ name: user.name, email: user.email, avatar: user.image }}
	logoutLabel="Abmelden"
	onLogout={logout}
	brandTitle={siteName}
	brandSubtitle="CMS"
	homeHref="/admin"
>
	{#snippet logo()}
		<div
			class="bg-primary text-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg"
		>
			<LayersIcon class="size-4" />
		</div>
	{/snippet}
</AppShellSidebar>
