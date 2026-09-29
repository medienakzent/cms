<script lang="ts">
	import { authClient } from '../../admin/auth-client';
	import type { AdminLayoutData } from '../../routes/admin/layout';
	import type { load } from '../../routes/admin/login';
	import { Button } from '@compdata/ui/button';
	import { Input } from '@compdata/ui/input';
	import { Label } from '@compdata/ui/label';
	import * as Card from '@compdata/ui/card';
	import { Separator } from '@compdata/ui/separator';

	let { data }: { data: AdminLayoutData & Awaited<ReturnType<typeof load>> } = $props();

	let mode = $state<'login' | 'signup' | 'forgot'>('login');
	let info = $state('');
	let email = $state('');
	let password = $state('');
	let name = $state('');
	let error = $state('');
	let busy = $state(false);

	const providerLabel: Record<string, string> = {
		github: 'GitHub',
		google: 'Google',
		microsoft: 'Microsoft'
	};

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		busy = true;
		error = '';
		if (mode === 'forgot') {
			const resetResult = await authClient.requestPasswordReset({
				email,
				redirectTo: '/admin/reset'
			});
			busy = false;
			if (resetResult.error) error = resetResult.error.message ?? 'Anfrage fehlgeschlagen';
			else info = 'Falls ein Konto existiert, ist eine E-Mail mit dem Link unterwegs.';
			return;
		}
		const result =
			mode === 'signup'
				? await authClient.signUp.email({ email, password, name: name || email })
				: await authClient.signIn.email({ email, password });
		busy = false;
		if (result.error) {
			error = result.error.message ?? 'Anmeldung fehlgeschlagen';
			return;
		}
		window.location.href = data.returnTo;
	}

	async function social(provider: 'github' | 'google' | 'microsoft') {
		await authClient.signIn.social({ provider, callbackURL: data.returnTo });
	}
</script>

<div class="bg-muted/40 flex min-h-screen items-center justify-center p-4">
	<Card.Root class="w-full max-w-sm">
		<Card.Header>
			<Card.Title>{data.siteName} · CMS</Card.Title>
			<Card.Description
				>{mode === 'signup'
					? 'Konto anlegen'
					: mode === 'forgot'
						? 'Passwort vergessen'
						: 'Anmelden'}</Card.Description
			>
		</Card.Header>
		<Card.Content class="space-y-4">
			{#if data.auth.providers.length}
				<div class="grid gap-2">
					{#each data.auth.providers as provider (provider)}
						<Button variant="outline" onclick={() => social(provider)}
							>Mit {providerLabel[provider]} anmelden</Button
						>
					{/each}
				</div>
				<div class="flex items-center gap-3">
					<Separator class="flex-1" /><span class="text-muted-foreground text-xs">oder</span
					><Separator class="flex-1" />
				</div>
			{/if}
			<form onsubmit={submit} class="space-y-3">
				{#if mode === 'signup'}
					<div class="space-y-1">
						<Label for="name">Name</Label><Input id="name" bind:value={name} autocomplete="name" />
					</div>
				{/if}
				<div class="space-y-1">
					<Label for="email">E-Mail</Label><Input
						id="email"
						type="email"
						bind:value={email}
						required
						autocomplete="email"
					/>
				</div>
				{#if mode !== 'forgot'}
					<div class="space-y-1">
						<Label for="password">Passwort</Label><Input
							id="password"
							type="password"
							bind:value={password}
							required
							minlength={8}
							autocomplete={mode === 'signup' ? 'new-password' : 'current-password'}
						/>
					</div>
				{/if}
				{#if error}<p class="text-destructive text-sm">{error}</p>{/if}
				{#if info}<p class="text-sm">{info}</p>{/if}
				<Button type="submit" class="w-full" disabled={busy}
					>{mode === 'signup'
						? 'Konto anlegen'
						: mode === 'forgot'
							? 'Link anfordern'
							: 'Anmelden'}</Button
				>
			</form>
			<div class="flex justify-between text-xs">
				{#if mode === 'forgot'}
					<button
						type="button"
						class="text-muted-foreground underline"
						onclick={() => {
							mode = 'login';
							info = '';
							error = '';
						}}>Zurück zur Anmeldung</button
					>
				{:else}
					<button
						type="button"
						class="text-muted-foreground underline"
						onclick={() => {
							mode = 'forgot';
							error = '';
						}}>Passwort vergessen?</button
					>
				{/if}
			</div>
			{#if data.signup && mode !== 'forgot'}
				<button
					type="button"
					class="text-muted-foreground w-full text-center text-xs underline"
					onclick={() => (mode = mode === 'login' ? 'signup' : 'login')}
				>
					{mode === 'login' ? 'Noch kein Konto? Registrieren' : 'Schon ein Konto? Anmelden'}
				</button>
			{/if}
		</Card.Content>
	</Card.Root>
</div>
