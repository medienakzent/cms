<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { Badge } from '@compdata/ui/badge';
	import { Button } from '@compdata/ui/button';
	import { ConfirmDialog } from '@compdata/ui/confirm-dialog';
	import { Input } from '@compdata/ui/input';
	import { Label } from '@compdata/ui/label';
	import { SearchableSelect } from '@compdata/ui/select';
	import * as Table from '@compdata/ui/table';
	import TrashIcon from '@lucide/svelte/icons/trash-2';
	import KeyIcon from '@lucide/svelte/icons/key-round';
	import { toast } from 'svelte-sonner';
	import { apiFetch } from '../../admin/api-client';
	import type { AdminLayoutData } from '../../routes/admin/layout';
	import type { AdminUser, load } from '../../routes/admin/users';

	let { data }: { data: AdminLayoutData & Awaited<ReturnType<typeof load>> } = $props();

	let name = $state('');
	let email = $state('');
	let password = $state('');
	let role = $state('editor');
	let busy = $state(false);
	let toDelete = $state<AdminUser | null>(null);
	let pwUser = $state<AdminUser | null>(null);
	let newPassword = $state('');

	const roles = [
		{ value: 'admin', label: 'Administrator' },
		{ value: 'editor', label: 'Redakteur' }
	];
	const fmt = (iso: string) => new Date(iso).toLocaleDateString('de-DE', { dateStyle: 'medium' });

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

	const create = (e: SubmitEvent) => {
		e.preventDefault();
		void run(async () => {
			await apiFetch('/api/v1/users', { method: 'POST', json: { name, email, password, role } });
			name = email = password = '';
			role = 'editor';
		}, 'Konto angelegt');
	};
	const setRole = (u: AdminUser, r: string) =>
		run(
			() => apiFetch(`/api/v1/users/${u.id}`, { method: 'PATCH', json: { role: r } }),
			'Rolle geändert'
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
			<Table.TableRow>
				<Table.TableCell class="font-medium"
					>{u.name}{#if u.id === data.user?.id}<Badge variant="id" class="ms-2">Sie</Badge
						>{/if}</Table.TableCell
				>
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
						class="text-destructive"
						onclick={() => (toDelete = u)}
						disabled={busy || u.id === data.user?.id}><TrashIcon aria-hidden="true" /></Button
					>
				</Table.TableCell>
			</Table.TableRow>
		{/each}
	</Table.TableBody>
</Table.Table>

<section class="border-border mt-10 max-w-lg rounded-lg border p-4">
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
			<Label for="u-pw">Passwort (mind. 8 Zeichen)</Label><Input
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
