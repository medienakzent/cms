<script lang="ts">
	import { Button } from '@compdata/ui/button';
	import { Input } from '@compdata/ui/input';
	import { Label } from '@compdata/ui/label';
	import { SearchableSelect } from '@compdata/ui/select';
	import CopyIcon from '@lucide/svelte/icons/copy';
	import { toast } from 'svelte-sonner';
	import { apiFetch, ApiError, issuesToMap } from '../../admin/api-client';
	import { ADMIN_ROLES } from '../../admin/roles';

	let name = $state('');
	let role = $state('editor');
	let busy = $state(false);
	let errors = $state<Record<string, string>>({});
	/** Shown once; the server stores only a hash. */
	let createdKey = $state<{ name: string; key: string } | null>(null);

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		busy = true;
		errors = {};
		try {
			const result = await apiFetch<{ key: string }>('/api/v1/api-keys', {
				method: 'POST',
				json: { name, role }
			});
			createdKey = { name, key: result.key };
			toast.success('API-Zugang angelegt');
		} catch (error) {
			if (error instanceof ApiError && error.issues.length) errors = issuesToMap(error.issues);
			toast.error((error as Error).message);
		} finally {
			busy = false;
		}
	}

	function copyKey() {
		if (!createdKey) return;
		navigator.clipboard
			.writeText(createdKey.key)
			.then(() => toast.success('Kopiert'))
			.catch(() => toast.error('Kopieren nicht möglich, bitte manuell markieren'));
	}
</script>

<h1 class="mb-1 text-2xl font-semibold">API-Zugang anlegen</h1>
<p class="text-muted-foreground mb-6 max-w-2xl text-sm">
	Schlüssel für Skripte und Integrationen mit denselben Rollen wie Nutzer. Verwendung: Header
	<code>Authorization: Bearer &lt;schlüssel&gt;</code> auf <code>/api/v1</code>. Die
	Nutzerverwaltung bleibt Browser-Konten vorbehalten.
</p>

{#if createdKey}
	<section class="border-primary bg-primary/5 max-w-2xl rounded-lg border p-4">
		<p class="mb-2 text-sm font-medium">
			Schlüssel „{createdKey.name}" — jetzt kopieren, er wird nicht erneut angezeigt:
		</p>
		<div class="flex flex-wrap items-center gap-2">
			<code class="bg-background rounded border px-2 py-1 text-sm break-all">{createdKey.key}</code>
			<Button size="sm" variant="outline" onclick={copyKey}
				><CopyIcon aria-hidden="true" /> Kopieren</Button
			>
		</div>
		<div class="mt-4 flex gap-2">
			<Button href="/admin/users">Zur Übersicht</Button>
			<Button
				variant="ghost"
				onclick={() => {
					createdKey = null;
					name = '';
				}}>Weiteren Schlüssel anlegen</Button
			>
		</div>
	</section>
{:else}
	<form onsubmit={submit} class="max-w-lg space-y-4">
		<div class="space-y-1">
			<Label for="key-name">Name (z. B. „Import-Skript")</Label>
			<Input id="key-name" bind:value={name} required maxlength={80} autocomplete="off" />
			{#if errors.name}<p class="text-destructive text-xs">{errors.name}</p>{/if}
		</div>
		<div class="space-y-1">
			<Label>Rolle</Label>
			<SearchableSelect
				options={ADMIN_ROLES}
				value={role}
				onSelect={(selectedRole) => (role = selectedRole)}
				class="w-56"
			/>
		</div>
		<div class="flex gap-2">
			<Button type="submit" disabled={busy}>Schlüssel anlegen</Button>
			<Button variant="ghost" href="/admin/users">Abbrechen</Button>
		</div>
	</form>
{/if}
