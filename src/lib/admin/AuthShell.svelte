<script lang="ts">
	import type { Snippet } from 'svelte';
	import * as Card from '@compdata/ui/card';
	import LayersIcon from '@lucide/svelte/icons/layers';

	/** Frame of the sign-in pages (login, password reset): site icon, name and the current step. */
	type Props = {
		siteName: string;
		favicon: string;
		/** Current step, e.g. "Anmelden" or "Neues Passwort setzen". */
		subtitle: string;
		children: Snippet;
	};

	let { siteName, favicon, subtitle, children }: Props = $props();
	let faviconFailed = $state(false);
</script>

<div class="bg-muted/40 relative flex min-h-screen items-center justify-center overflow-hidden p-4">
	<div
		aria-hidden="true"
		class="bg-primary/15 pointer-events-none absolute -top-48 -left-40 size-[34rem] rounded-full blur-3xl"
	></div>
	<div
		aria-hidden="true"
		class="bg-primary/10 pointer-events-none absolute -right-48 -bottom-56 size-[38rem] rounded-full blur-3xl"
	></div>

	<main class="relative w-full max-w-sm">
		<div class="mb-6 flex flex-col items-center gap-4 text-center">
			<div
				class="bg-card ring-border flex size-18 items-center justify-center rounded-2xl p-3 shadow-lg ring-1"
			>
				{#if favicon && !faviconFailed}
					<img
						src={favicon}
						alt=""
						class="size-full object-contain"
						onerror={() => (faviconFailed = true)}
					/>
				{:else}
					<LayersIcon class="text-primary size-8" aria-hidden="true" />
				{/if}
			</div>
			<div class="space-y-1">
				<h1 class="text-2xl font-semibold tracking-tight">{siteName}</h1>
				<p class="text-muted-foreground text-sm">{subtitle}</p>
			</div>
		</div>

		<Card.Root class="shadow-xl">
			<Card.Content class="space-y-4 px-6 py-2">
				{@render children()}
			</Card.Content>
		</Card.Root>

		<p class="text-muted-foreground mt-6 text-center text-xs">Redaktionszugang · CMS</p>
	</main>
</div>
