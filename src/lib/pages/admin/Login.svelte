<script lang="ts">
	import { authClient, authErrorMessage } from '../../admin/auth-client';
	import type { AdminLayoutData } from '../../routes/admin/layout';
	import type { load } from '../../routes/admin/login';
	import { Button } from '@compdata/ui/button';
	import { Input } from '@compdata/ui/input';
	import { Label } from '@compdata/ui/label';
	import AuthShell from '../../admin/AuthShell.svelte';
	import { Separator } from '@compdata/ui/separator';

	let { data }: { data: AdminLayoutData & Awaited<ReturnType<typeof load>> } = $props();

	let mode = $state<'login' | 'signup' | 'forgot' | 'totp' | 'backup'>('login');
	let code = $state('');
	let trustDevice = $state(false);
	let info = $state('');
	let email = $state('');
	let password = $state('');
	let name = $state('');
	let error = $state('');
	let busy = $state(false);

	const subtitle = $derived(
		mode === 'signup'
			? 'Konto anlegen'
			: mode === 'forgot'
				? 'Passwort vergessen'
				: mode === 'totp'
					? 'Code aus der Authenticator-App eingeben'
					: mode === 'backup'
						? 'Einen der Backup-Codes eingeben'
						: 'Anmelden'
	);

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
		if (mode === 'totp' || mode === 'backup') {
			const verification =
				mode === 'totp'
					? await authClient.twoFactor.verifyTotp({ code: code.replace(/\s/g, ''), trustDevice })
					: await authClient.twoFactor.verifyBackupCode({ code: code.trim(), trustDevice });
			busy = false;
			if (verification.error) {
				error = authErrorMessage(verification.error, 'Code konnte nicht geprüft werden');
				if (verification.error.code === 'INVALID_TWO_FACTOR_COOKIE') mode = 'login';
				return;
			}
			window.location.href = data.returnTo;
			return;
		}
		const result =
			mode === 'signup'
				? await authClient.signUp.email({ email, password, name: name || email })
				: await authClient.signIn.email({ email, password });
		busy = false;
		if (result.error) {
			error = authErrorMessage(result.error, 'Anmeldung fehlgeschlagen');
			return;
		}
		// Accounts with a second factor get no session yet, only the request for the code.
		if ((result.data as { twoFactorRedirect?: boolean } | null)?.twoFactorRedirect) {
			mode = 'totp';
			code = '';
			return;
		}
		window.location.href = data.returnTo;
	}

	async function social(provider: 'github' | 'google' | 'microsoft') {
		await authClient.signIn.social({ provider, callbackURL: data.returnTo });
	}
</script>

<AuthShell siteName={data.siteName} favicon={data.siteFavicon} {subtitle}>
	{#if data.auth.providers.length && mode !== 'totp' && mode !== 'backup'}
		<div class="grid gap-2">
			{#each data.auth.providers as provider (provider)}
				<Button variant="outline" onclick={() => social(provider)}
					>Mit {providerLabel[provider]} anmelden</Button
				>
			{/each}
		</div>
		<div class="flex items-center gap-3">
			<Separator class="flex-1" /><span class="text-muted-foreground text-xs">oder</span><Separator
				class="flex-1"
			/>
		</div>
	{/if}
	<form onsubmit={submit} class="space-y-3">
		{#if mode === 'totp' || mode === 'backup'}
			<div class="space-y-1">
				<Label for="code">{mode === 'totp' ? 'Code' : 'Backup-Code'}</Label><Input
					id="code"
					bind:value={code}
					required
					autocomplete="one-time-code"
					inputmode={mode === 'totp' ? 'numeric' : 'text'}
					placeholder={mode === 'totp' ? '123456' : ''}
				/>
			</div>
			<label class="flex items-center gap-2 text-sm">
				<input type="checkbox" bind:checked={trustDevice} class="accent-primary size-4" />
				Diesem Gerät 30 Tage vertrauen
			</label>
		{/if}
		{#if mode === 'signup'}
			<div class="space-y-1">
				<Label for="name">Name</Label><Input id="name" bind:value={name} autocomplete="name" />
			</div>
		{/if}
		{#if mode !== 'totp' && mode !== 'backup'}
			<div class="space-y-1">
				<Label for="email">E-Mail</Label><Input
					id="email"
					type="email"
					bind:value={email}
					required
					autocomplete="email"
				/>
			</div>
		{/if}
		{#if mode === 'login' || mode === 'signup'}
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
					: mode === 'totp' || mode === 'backup'
						? 'Bestätigen'
						: 'Anmelden'}</Button
		>
	</form>
	<div class="flex justify-between text-xs">
		{#if mode === 'totp' || mode === 'backup'}
			<button
				type="button"
				class="text-muted-foreground underline"
				onclick={() => {
					mode = mode === 'totp' ? 'backup' : 'totp';
					code = '';
					error = '';
				}}>{mode === 'totp' ? 'Backup-Code verwenden' : 'Code aus der App verwenden'}</button
			>
			<button
				type="button"
				class="text-muted-foreground underline"
				onclick={() => {
					mode = 'login';
					code = '';
					error = '';
				}}>Zurück</button
			>
		{:else if mode === 'forgot'}
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
	{#if data.signup && (mode === 'login' || mode === 'signup')}
		<button
			type="button"
			class="text-muted-foreground w-full text-center text-xs underline"
			onclick={() => (mode = mode === 'login' ? 'signup' : 'login')}
		>
			{mode === 'login' ? 'Noch kein Konto? Registrieren' : 'Schon ein Konto? Anmelden'}
		</button>
	{/if}
</AuthShell>
