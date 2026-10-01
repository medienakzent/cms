<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '@compdata/ui/button';
	import { Input } from '@compdata/ui/input';
	import { Label } from '@compdata/ui/label';
	import { SearchableSelect } from '@compdata/ui/select';
	import { toast } from 'svelte-sonner';
	import { apiFetch, ApiError, issuesToMap } from '../../admin/api-client';
	import { ADMIN_ROLES } from '../../admin/roles';
	import PasswordInput from '../../admin/PasswordInput.svelte';

	let name = $state('');
	let email = $state('');
	let password = $state('');
	let role = $state('editor');
	let busy = $state(false);
	let errors = $state<Record<string, string>>({});

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		busy = true;
		errors = {};
		try {
			await apiFetch('/api/v1/users', { method: 'POST', json: { name, email, password, role } });
			toast.success(`Konto „${email}" angelegt`);
			await goto('/admin/users', { invalidateAll: true });
		} catch (error) {
			if (error instanceof ApiError && error.issues.length) errors = issuesToMap(error.issues);
			toast.error((error as Error).message);
		} finally {
			busy = false;
		}
	}
</script>

<h1 class="mb-1 text-2xl font-semibold">Konto anlegen</h1>
<p class="text-muted-foreground mb-6 text-sm">
	Neue Nutzer melden sich mit E-Mail und Passwort an und können es über „Passwort vergessen" selbst
	ändern.
</p>

<form onsubmit={submit} class="max-w-lg space-y-4">
	<div class="space-y-1">
		<Label for="user-name">Name</Label>
		<Input id="user-name" bind:value={name} required maxlength={120} autocomplete="off" />
		{#if errors.name}<p class="text-destructive text-xs">{errors.name}</p>{/if}
	</div>
	<div class="space-y-1">
		<Label for="user-email">E-Mail</Label>
		<Input id="user-email" type="email" bind:value={email} required autocomplete="off" />
		{#if errors.email}<p class="text-destructive text-xs">{errors.email}</p>{/if}
	</div>
	<div class="space-y-1">
		<Label for="user-password">Passwort (mind. 8 Zeichen)</Label>
		<PasswordInput
			id="user-password"
			bind:value={password}
			required
			generate
			invalid={!!errors.password}
		/>
		{#if errors.password}<p class="text-destructive text-xs">{errors.password}</p>{/if}
	</div>
	<div class="space-y-1">
		<Label>Rolle</Label>
		<SearchableSelect
			options={ADMIN_ROLES}
			value={role}
			onSelect={(selectedRole) => (role = selectedRole)}
			class="w-56"
		/>
		<p class="text-muted-foreground text-xs">
			Administratoren verwalten Nutzer und API-Zugänge; Redakteure pflegen Inhalte und Medien.
		</p>
	</div>
	<div class="flex gap-2">
		<Button type="submit" disabled={busy}>Anlegen</Button>
		<Button variant="ghost" href="/admin/users">Abbrechen</Button>
	</div>
</form>
