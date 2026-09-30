<script lang="ts">
	import { renderSVG } from 'uqr';
	import { Badge } from '@compdata/ui/badge';
	import { Button } from '@compdata/ui/button';
	import * as Card from '@compdata/ui/card';
	import { Input } from '@compdata/ui/input';
	import { Label } from '@compdata/ui/label';
	import CopyIcon from '@lucide/svelte/icons/copy';
	import { toast } from 'svelte-sonner';
	import { authClient, authErrorMessage } from '../../admin/auth-client';
	import type { load } from '../../routes/admin/security';

	let { data }: { data: Awaited<ReturnType<typeof load>> } = $props();

	type Step = 'idle' | 'password' | 'scan' | 'disable' | 'renew';
	let step = $state<Step>('idle');
	let password = $state('');
	let code = $state('');
	let error = $state('');
	let busy = $state(false);
	let totpUri = $state('');
	let backupCodes = $state<string[]>([]);

	const required = $derived(data.mode === 'required');
	const secret = $derived(totpUri ? (new URL(totpUri).searchParams.get('secret') ?? '') : '');
	const qrCode = $derived(totpUri ? renderSVG(totpUri, { border: 2 }) : '');

	function start(next: Step) {
		step = next;
		password = '';
		code = '';
		error = '';
	}

	async function begin(event: SubmitEvent) {
		event.preventDefault();
		busy = true;
		error = '';
		const result = await authClient.twoFactor.enable({ password, method: 'totp' });
		busy = false;
		if (result.error || result.data?.method !== 'totp') {
			error = authErrorMessage(result.error, 'Einrichtung fehlgeschlagen');
			return;
		}
		totpUri = result.data.totpURI;
		backupCodes = result.data.backupCodes;
		password = '';
		step = 'scan';
	}

	async function confirm(event: SubmitEvent) {
		event.preventDefault();
		busy = true;
		error = '';
		const result = await authClient.twoFactor.verifyTotp({ code: code.replace(/\s/g, '') });
		busy = false;
		if (result.error) {
			error = authErrorMessage(result.error, 'Code konnte nicht geprüft werden');
			return;
		}
		toast.success('Zwei-Faktor-Anmeldung ist aktiv');
		window.location.href = '/admin/security';
	}

	async function disable(event: SubmitEvent) {
		event.preventDefault();
		busy = true;
		error = '';
		const result = await authClient.twoFactor.disable({ password });
		busy = false;
		if (result.error) {
			error = authErrorMessage(result.error, 'Abschalten fehlgeschlagen');
			return;
		}
		toast.success('Zwei-Faktor-Anmeldung abgeschaltet');
		window.location.href = '/admin/security';
	}

	async function renew(event: SubmitEvent) {
		event.preventDefault();
		busy = true;
		error = '';
		const result = await authClient.twoFactor.generateBackupCodes({ password });
		busy = false;
		if (result.error || !result.data) {
			error = authErrorMessage(result.error, 'Backup-Codes konnten nicht erzeugt werden');
			return;
		}
		backupCodes = result.data.backupCodes;
		password = '';
		step = 'idle';
	}

	async function copy(text: string, label: string) {
		try {
			await navigator.clipboard.writeText(text);
			toast.success(`${label} kopiert`);
		} catch {
			toast.error('Kopieren nicht möglich');
		}
	}
</script>

{#snippet passwordForm(
	onsubmit: (event: SubmitEvent) => void,
	submitLabel: string,
	destructive = false
)}
	<form {onsubmit} class="max-w-sm space-y-3">
		<div class="space-y-1">
			<Label for="password">Passwort zur Bestätigung</Label>
			<Input
				id="password"
				type="password"
				bind:value={password}
				required
				autocomplete="current-password"
			/>
		</div>
		{#if error}<p class="text-destructive text-sm">{error}</p>{/if}
		<div class="flex gap-2">
			<Button type="submit" variant={destructive ? 'destructive' : 'default'} disabled={busy}
				>{submitLabel}</Button
			>
			<Button type="button" variant="ghost" onclick={() => start('idle')}>Abbrechen</Button>
		</div>
	</form>
{/snippet}

{#snippet codeList()}
	<div class="space-y-2">
		<p class="text-sm">
			Jeder Backup-Code funktioniert genau einmal, falls das Handy nicht zur Hand ist. Bitte sicher
			aufbewahren — sie werden nicht noch einmal angezeigt.
		</p>
		<div class="bg-muted grid grid-cols-2 gap-x-6 gap-y-1 rounded-md p-3 font-mono text-sm">
			{#each backupCodes as backupCode (backupCode)}<span>{backupCode}</span>{/each}
		</div>
		<Button size="sm" variant="outline" onclick={() => copy(backupCodes.join('\n'), 'Backup-Codes')}
			><CopyIcon aria-hidden="true" /> Codes kopieren</Button
		>
	</div>
{/snippet}

<h1 class="mb-6 text-2xl font-semibold">Sicherheit</h1>

<Card.Root class="max-w-2xl">
	<Card.Header>
		<Card.Title class="flex items-center gap-2"
			>Zwei-Faktor-Anmeldung
			{#if data.enabled}<Badge variant="positive">aktiv</Badge>{:else}<Badge variant="neutral"
					>nicht eingerichtet</Badge
				>{/if}</Card.Title
		>
		<Card.Description>
			Nach dem Passwort fragt die Anmeldung zusätzlich einen Code aus einer Authenticator-App ab (z.
			B. Google Authenticator, Microsoft Authenticator, 1Password).
		</Card.Description>
	</Card.Header>
	<Card.Content class="space-y-4">
		{#if !data.passwordLogin}
			<p class="text-sm">
				Dieses Konto meldet sich über einen externen Anbieter an (GitHub, Google oder Microsoft).
				Die Zwei-Faktor-Anmeldung wird dort verwaltet.
			</p>
		{:else if data.enabled}
			{#if backupCodes.length}
				{@render codeList()}
			{/if}
			{#if step === 'renew'}
				{@render passwordForm(renew, 'Neue Backup-Codes erzeugen')}
			{:else if step === 'disable'}
				{@render passwordForm(disable, 'Abschalten', true)}
			{:else}
				<div class="flex flex-wrap gap-2">
					<Button variant="outline" onclick={() => start('renew')}>Neue Backup-Codes</Button>
					{#if !required}
						<Button variant="ghost" class="text-destructive" onclick={() => start('disable')}
							>Abschalten</Button
						>
					{/if}
				</div>
			{/if}
		{:else if step === 'scan'}
			<ol class="list-decimal space-y-4 ps-5 text-sm">
				<li class="space-y-2">
					<p>QR-Code mit der Authenticator-App scannen.</p>
					<!-- renderSVG only encodes the otpauth URI into rectangles; no user markup. -->
					<div class="w-48 rounded-md bg-white p-2 text-black">{@html qrCode}</div>
					<p class="text-muted-foreground">
						Oder den Schlüssel von Hand eingeben:
						<code class="text-foreground break-all">{secret}</code>
						<button
							type="button"
							class="ms-1 align-middle"
							onclick={() => copy(secret, 'Schlüssel')}
							aria-label="Schlüssel kopieren"><CopyIcon class="inline size-3.5" /></button
						>
					</p>
				</li>
				<li>{@render codeList()}</li>
				<li>
					<form onsubmit={confirm} class="max-w-sm space-y-3">
						<div class="space-y-1">
							<Label for="code">Code aus der App</Label>
							<Input
								id="code"
								bind:value={code}
								required
								inputmode="numeric"
								autocomplete="one-time-code"
								pattern={'[0-9 ]{6,7}'}
								placeholder="123456"
							/>
						</div>
						{#if error}<p class="text-destructive text-sm">{error}</p>{/if}
						<Button type="submit" disabled={busy}>Bestätigen und aktivieren</Button>
					</form>
				</li>
			</ol>
		{:else if step === 'password'}
			{@render passwordForm(begin, 'Weiter')}
		{:else}
			{#if required}
				<p class="text-sm font-medium">
					Für dieses CMS ist die Zwei-Faktor-Anmeldung Pflicht. Bitte jetzt einrichten, danach ist
					der Admin wieder erreichbar.
				</p>
			{/if}
			<Button onclick={() => start('password')}>Jetzt einrichten</Button>
		{/if}
	</Card.Content>
</Card.Root>
