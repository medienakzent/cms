<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { Badge } from '@compdata/ui/badge';
	import { Button } from '@compdata/ui/button';
	import { ConfirmDialog } from '@compdata/ui/confirm-dialog';
	import { Input } from '@compdata/ui/input';
	import { Label } from '@compdata/ui/label';
	import { SearchableSelect } from '@compdata/ui/select';
	import * as Table from '@compdata/ui/table';
	import BanIcon from '@lucide/svelte/icons/ban';
	import CopyIcon from '@lucide/svelte/icons/copy';
	import KeyIcon from '@lucide/svelte/icons/key-round';
	import TrashIcon from '@lucide/svelte/icons/trash-2';
	import { toast } from 'svelte-sonner';
	import { apiFetch } from '../../admin/api-client';
	import type { AdminLayoutData } from '../../routes/admin/layout';
	import type { AdminUser, load } from '../../routes/admin/users';

	/** Nutzer und API-Zugänge — nur für Administratoren. */
	let { data }: { data: AdminLayoutData & Awaited<ReturnType<typeof load>> } = $props();

	const roles = [
		{ value: 'admin', label: 'Administrator' },
		{ value: 'editor', label: 'Redakteur' }
	];
	const fmt = (iso: string) => new Date(iso).toLocaleDateString('de-DE', { dateStyle: 'medium' });

	let busy = $state(false);
	// Konto anlegen
	let name = $state('');
	let email = $state('');
	let password = $state('');
	let role = $state('editor');
	// Dialoge
	let toDelete = $state<AdminUser | null>(null);
	let pwUser = $state<AdminUser | null>(null);
	let newPassword = $state('');
	// API-Zugänge
	let keyName = $state('');
	let keyRole = $state('editor');
	let createdKey = $state<{ name: string; key: string } | null>(null);
	let keyToRevoke = $state<{ id: string; name: string } | null>(null);

	async function run(fn: () => Promise<unknown>, ok: string) {
		busy = true;
		try {
			await fn();
			toast.success(ok);
			await invalidateAll();
		} catch (e) {
			toast.error((e as Error).message);
		} finally {
			busy = false;
		}
	}

	function create(e: SubmitEvent) {
		e.preventDefault();
		void run(async () => {
			await apiFetch('/api/v1/users', { method: 'POST', json: { name, email, password, role } });
			name = email = password = '';
			role = 'editor';
		}, 'Konto angelegt');
	}
	const setRole = (u: AdminUser, r: string) =>
		run(
			() => apiFetch(`/api/v1/users/${u.id}`, { method: 'PATCH', json: { role: r } }),
			'Rolle geändert'
		);
	const setBanned = (u: AdminUser, banned: boolean) =>
		run(
			() => apiFetch(`/api/v1/users/${u.id}`, { method: 'PATCH', json: { banned } }),
			banned ? 'Konto gesperrt' : 'Konto entsperrt'
		);
	const setPassword = () =>
		run(async () => {
			await apiFetch(`/api/v1/users/${pwUser!.id}`, {
				method: 'PATCH',
				json: { password: newPassword }
			});
			pwUser = null;
			newPassword = '';
		}, 'Passwort gesetzt');
	const remove = () =>
		run(async () => {
			await apiFetch(`/api/v1/users/${toDelete!.id}`, { method: 'DELETE' });
			toDelete = null;
		}, 'Konto entfernt');

	function createKey(e: SubmitEvent) {
		e.preventDefault();
		void run(async () => {
			const r = await apiFetch<{ key: string }>('/api/v1/api-keys', {
				method: 'POST',
				json: { name: keyName, role: keyRole }
			});
			createdKey = { name: keyName, key: r.key };
			keyName = '';
		}, 'API-Zugang angelegt');
	}
	const revokeKey = () =>
		run(async () => {
			await apiFetch(`/api/v1/api-keys/${keyToRevoke!.id}`, { method: 'DELETE' });
			keyToRevoke = null;
		}, 'API-Zugang widerrufen');
	function copyKey() {
		if (createdKey)
			navigator.clipboard.writeText(createdKey.key).then(() => toast.success('Kopiert'));
	}
</script>

<h1 class="mb-6 text-2xl font-semibold">
	Nutzer <span class="text-muted-foreground text-base font-normal">({data.users.length})</span>
</h1>

<Table.Table>
	<Table.TableHeader>
		<Table.TableRow>
			<Table.TableHead>Name</Table.TableHead>
			<Table.TableHead>E-Mail</Table.TableHead>
			<Table.TableHead>Rolle</Table.TableHead>
			<Table.TableHead>Seit</Table.TableHead>
			<Table.TableHead></Table.TableHead>
		</Table.TableRow>
	</Table.TableHeader>
	<Table.TableBody>
		{#each data.users as u (u.id)}
			<Table.TableRow class={u.banned ? 'opacity-60' : ''}>
				<Table.TableCell class="font-medium">
					{u.name}
					{#if u.id === data.user?.id}<Badge variant="id" class="ms-2">Sie</Badge>{/if}
					{#if u.banned}<Badge variant="signal" class="ms-2">gesperrt</Badge>{/if}
				</Table.TableCell>
				<Table.TableCell>{u.email}</Table.TableCell>
				<Table.TableCell>
					<SearchableSelect
						options={roles}
						value={u.role}
						onSelect={(r) => setRole(u, r)}
						disabled={busy || u.id === data.user?.id}
						class="w-44"
					/>
				</Table.TableCell>
				<Table.TableCell class="text-muted-foreground text-sm">{fmt(u.createdAt)}</Table.TableCell>
				<Table.TableCell class="text-right whitespace-nowrap">
					<Button size="sm" variant="ghost" onclick={() => (pwUser = u)} disabled={busy}
						><KeyIcon aria-hidden="true" /> Passwort</Button
					>
					<Button
						size="sm"
						variant="ghost"
						onclick={() => setBanned(u, !u.banned)}
						disabled={busy || u.id === data.user?.id}
						title={u.banned ? 'Entsperren' : 'Sperren'}
						aria-label={u.banned ? 'Entsperren' : 'Sperren'}
					>
						<BanIcon aria-hidden="true" />
					</Button>
					<Button
						size="sm"
						variant="ghost"
						class="text-destructive"
						onclick={() => (toDelete = u)}
						disabled={busy || u.id === data.user?.id}
						aria-label="Konto entfernen"
					>
						<TrashIcon aria-hidden="true" />
					</Button>
				</Table.TableCell>
			</Table.TableRow>
		{/each}
	</Table.TableBody>
</Table.Table>

<section class="border-border mt-6 max-w-lg rounded-lg border p-4">
	<h2 class="mb-3 font-medium">Konto anlegen</h2>
	<form onsubmit={create} class="grid gap-3">
		<div class="grid gap-1">
			<Label for="u-name">Name</Label><Input id="u-name" bind:value={name} required />
		</div>
		<div class="grid gap-1">
			<Label for="u-email">E-Mail</Label><Input
				id="u-email"
				type="email"
				bind:value={email}
				required
			/>
		</div>
		<div class="grid gap-1">
			<Label for="u-pw">Passwort (mind. 8 Zeichen)</Label>
			<Input
				id="u-pw"
				type="password"
				bind:value={password}
				required
				minlength={8}
				autocomplete="new-password"
			/>
		</div>
		<div class="grid gap-1">
			<Label>Rolle</Label><SearchableSelect
				options={roles}
				value={role}
				onSelect={(r) => (role = r)}
			/>
		</div>
		<div><Button type="submit" disabled={busy}>Anlegen</Button></div>
	</form>
	<p class="text-muted-foreground mt-3 text-xs">
		Neue Nutzer melden sich mit E-Mail und Passwort an und können es über „Passwort vergessen"
		selbst ändern.
	</p>
</section>

<section class="mt-10">
	<h2 class="mb-1 text-lg font-semibold">API-Zugänge</h2>
	<p class="text-muted-foreground mb-4 text-sm">
		Schlüssel für Skripte und Integrationen mit denselben Rollen wie Nutzer. Verwendung: Header
		<code>Authorization: Bearer &lt;schlüssel&gt;</code> auf <code>/api/v1</code>. Die
		Nutzerverwaltung bleibt Browser-Konten vorbehalten.
	</p>

	{#if createdKey}
		<div class="border-primary bg-primary/5 mb-4 rounded-lg border p-4">
			<p class="mb-2 text-sm font-medium">
				Neuer Schlüssel „{createdKey.name}" — jetzt kopieren, er wird nicht erneut angezeigt:
			</p>
			<div class="flex flex-wrap items-center gap-2">
				<code class="bg-background rounded border px-2 py-1 text-sm break-all"
					>{createdKey.key}</code
				>
				<Button size="sm" variant="outline" onclick={copyKey}
					><CopyIcon aria-hidden="true" /> Kopieren</Button
				>
				<Button size="sm" variant="ghost" onclick={() => (createdKey = null)}>Schließen</Button>
			</div>
		</div>
	{/if}

	{#if data.apiKeys.length}
		<Table.Table>
			<Table.TableHeader>
				<Table.TableRow>
					<Table.TableHead>Name</Table.TableHead>
					<Table.TableHead>Präfix</Table.TableHead>
					<Table.TableHead>Rolle</Table.TableHead>
					<Table.TableHead>Angelegt</Table.TableHead>
					<Table.TableHead>Zuletzt genutzt</Table.TableHead>
					<Table.TableHead></Table.TableHead>
				</Table.TableRow>
			</Table.TableHeader>
			<Table.TableBody>
				{#each data.apiKeys as k (k.id)}
					<Table.TableRow class={k.revokedAt ? 'opacity-50' : ''}>
						<Table.TableCell class="font-medium">
							{k.name}
							{#if k.revokedAt}<Badge variant="neutral" class="ms-2">widerrufen</Badge>{/if}
						</Table.TableCell>
						<Table.TableCell><code class="text-xs">{k.prefix}…</code></Table.TableCell>
						<Table.TableCell>{k.role === 'admin' ? 'Administrator' : 'Redakteur'}</Table.TableCell>
						<Table.TableCell class="text-muted-foreground text-sm"
							>{fmt(k.createdAt)} · {k.createdBy}</Table.TableCell
						>
						<Table.TableCell class="text-muted-foreground text-sm"
							>{k.lastUsedAt ? fmt(k.lastUsedAt) : '—'}</Table.TableCell
						>
						<Table.TableCell class="text-right">
							{#if !k.revokedAt}
								<Button
									size="sm"
									variant="ghost"
									class="text-destructive"
									onclick={() => (keyToRevoke = k)}
									disabled={busy}>Widerrufen</Button
								>
							{/if}
						</Table.TableCell>
					</Table.TableRow>
				{/each}
			</Table.TableBody>
		</Table.Table>
	{/if}

	<form
		onsubmit={createKey}
		class="border-border mt-4 flex max-w-2xl flex-wrap items-end gap-3 rounded-lg border p-4"
	>
		<div class="grid min-w-48 flex-1 gap-1">
			<Label for="k-name">Name (z. B. „Import-Skript")</Label>
			<Input id="k-name" bind:value={keyName} required maxlength={80} />
		</div>
		<div class="grid gap-1">
			<Label>Rolle</Label><SearchableSelect
				options={roles}
				value={keyRole}
				onSelect={(r) => (keyRole = r)}
				class="w-44"
			/>
		</div>
		<Button type="submit" disabled={busy}>Schlüssel anlegen</Button>
	</form>
</section>

<ConfirmDialog
	open={keyToRevoke !== null}
	title="API-Zugang widerrufen?"
	body={`Der Schlüssel „${keyToRevoke?.name ?? ''}" funktioniert danach sofort nicht mehr.`}
	confirmLabel="Widerrufen"
	cancelLabel="Abbrechen"
	destructive
	loading={busy}
	onConfirm={revokeKey}
	onCancel={() => (keyToRevoke = null)}
/>

<ConfirmDialog
	open={toDelete !== null}
	title="Konto entfernen?"
	body={`Das Konto „${toDelete?.email ?? ''}" wird gelöscht. Inhalte bleiben erhalten.`}
	confirmLabel="Entfernen"
	cancelLabel="Abbrechen"
	destructive
	loading={busy}
	onConfirm={remove}
	onCancel={() => (toDelete = null)}
/>

<ConfirmDialog
	open={pwUser !== null}
	title="Neues Passwort setzen"
	confirmLabel="Speichern"
	cancelLabel="Abbrechen"
	loading={busy}
	onConfirm={setPassword}
	onCancel={() => {
		pwUser = null;
		newPassword = '';
	}}
>
	<div class="grid gap-2">
		<Label for="pw-new">Passwort für {pwUser?.email}</Label>
		<Input
			id="pw-new"
			type="password"
			bind:value={newPassword}
			minlength={8}
			autocomplete="new-password"
		/>
	</div>
</ConfirmDialog>
