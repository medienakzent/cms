<script lang="ts">
	import { authClient } from '../../admin/auth-client';
	import PasswordInput from '../../admin/PasswordInput.svelte';
	import { Button } from '@compdata/ui/button';
	import { Label } from '@compdata/ui/label';
	import AuthShell from '../../admin/AuthShell.svelte';
	import type { AdminLayoutData } from '../../routes/admin/layout';
	import type { load } from '../../routes/admin/reset';

	let { data }: { data: AdminLayoutData & Awaited<ReturnType<typeof load>> } = $props();

	let password = $state('');
	let error = $state('');
	let done = $state(false);
	let busy = $state(false);

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		busy = true;
		error = '';
		const result = await authClient.resetPassword({ newPassword: password, token: data.token });
		busy = false;
		if (result.error) {
			error = result.error.message ?? 'Der Link ist ungültig oder abgelaufen.';
			return;
		}
		done = true;
	}
</script>

<AuthShell siteName={data.siteName} favicon={data.siteFavicon} subtitle="Neues Passwort setzen">
	{#if done}
		<p class="text-sm">Das Passwort wurde geändert.</p>
		<Button href="/admin/login" class="w-full">Zur Anmeldung</Button>
	{:else if !data.token || data.invalid}
		<p class="text-destructive text-sm">
			Der Link ist ungültig oder abgelaufen. Bitte fordern Sie über „Passwort vergessen" einen neuen
			an.
		</p>
		<Button href="/admin/login" variant="outline" class="w-full">Zur Anmeldung</Button>
	{:else}
		<form onsubmit={submit} class="space-y-3">
			<div class="space-y-1">
				<Label for="password">Neues Passwort</Label><PasswordInput
					id="password"
					bind:value={password}
					required
					generate
				/>
			</div>
			{#if error}<p class="text-destructive text-sm">{error}</p>{/if}
			<Button type="submit" class="w-full" disabled={busy}>Passwort speichern</Button>
		</form>
	{/if}
</AuthShell>
