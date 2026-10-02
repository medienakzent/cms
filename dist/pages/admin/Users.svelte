<script lang="ts">
	import { formatDate, formatDateTime } from '../../format';
	import { invalidateAll } from '$app/navigation';
	import { Badge } from '@compdata/ui/badge';
	import { Button } from '@compdata/ui/button';
	import { ConfirmDialog } from '@compdata/ui/confirm-dialog';
	import { Label } from '@compdata/ui/label';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import { SearchableSelect } from '@compdata/ui/select';
	import * as Table from '@compdata/ui/table';
	import BanIcon from '@lucide/svelte/icons/ban';
	import KeyIcon from '@lucide/svelte/icons/key-round';
	import TrashIcon from '@lucide/svelte/icons/trash-2';
	import ShieldOffIcon from '@lucide/svelte/icons/shield-off';
	import { toast } from 'svelte-sonner';
	import { apiFetch } from '../../admin/api-client';
	import { ADMIN_ROLES } from '../../admin/roles';
	import PasswordInput from '../../admin/PasswordInput.svelte';
	import type { AdminLayoutData } from '../../routes/admin/layout';
	import type { AdminUser, load } from '../../routes/admin/users';

	let { data }: { data: AdminLayoutData & Awaited<ReturnType<typeof load>> } = $props();

	let busy = $state(false);
	// Dialogs
	let toDelete = $state<AdminUser | null>(null);
	let passwordUser = $state<AdminUser | null>(null);
	let newPassword = $state('');
	let keyToRevoke = $state<{ id: string; name: string } | null>(null);
	let twoFactorUser = $state<AdminUser | null>(null);

	async function run(action: () => Promise<unknown>, successMessage: string) {
		busy = true;
		try {
			await action();
			toast.success(successMessage);
			await invalidateAll();
		} catch (error) {
			toast.error((error as Error).message);
		} finally {
			busy = false;
		}
	}

	const setRole = (user: AdminUser, newRole: string) =>
		run(
			() => apiFetch(`/api/v1/users/${user.id}`, { method: 'PATCH', json: { role: newRole } }),
			'Rolle geändert'
		);
	const setBanned = (user: AdminUser, banned: boolean) =>
		run(
			() => apiFetch(`/api/v1/users/${user.id}`, { method: 'PATCH', json: { banned } }),
			banned ? 'Konto gesperrt' : 'Konto entsperrt'
		);
	const setPassword = () =>
		run(async () => {
			await apiFetch(`/api/v1/users/${passwordUser!.id}`, {
				method: 'PATCH',
				json: { password: newPassword }
			});
			passwordUser = null;
			newPassword = '';
		}, 'Passwort gesetzt');
	const remove = () =>
		run(async () => {
			await apiFetch(`/api/v1/users/${toDelete!.id}`, { method: 'DELETE' });
			toDelete = null;
		}, 'Konto entfernt');

	const resetSecondFactor = () =>
		run(async () => {
			await apiFetch(`/api/v1/users/${twoFactorUser!.id}`, {
				method: 'PATCH',
				json: { twoFactor: false }
			});
			twoFactorUser = null;
		}, 'Zwei-Faktor-Anmeldung zurückgesetzt');

	const revokeKey = () =>
		run(async () => {
			await apiFetch(`/api/v1/api-keys/${keyToRevoke!.id}`, { method: 'DELETE' });
			keyToRevoke = null;
		}, 'API-Zugang widerrufen');
</script>

<div class="mb-6 flex flex-wrap items-center justify-between gap-3">
	<h1 class="text-2xl font-semibold">
		Nutzer <Badge variant="neutral" class="ms-2 align-middle">{data.users.length}</Badge>
	</h1>
	<Button href="/admin/users/new"><PlusIcon aria-hidden="true" /> Konto anlegen</Button>
</div>

{#snippet columns()}
	<!-- Shared widths keep the user and API key tables aligned. -->
	<colgroup>
		<col />
		<col class="w-[21%]" />
		<col class="w-[11rem]" />
		<col class="w-[7.25rem]" />
		<col class="w-[9.5rem]" />
		<col class="w-[10.5rem]" />
	</colgroup>
{/snippet}

{#snippet userBadges(user: AdminUser)}
	{#if user.id === data.user?.id}<Badge variant="id" class="ms-2">Sie</Badge>{/if}
	{#if user.banned}<Badge variant="signal" class="ms-2">gesperrt</Badge>{/if}
	{#if data.twoFactor !== 'off' && user.twoFactorEnabled}<Badge
			variant="positive"
			class="ms-2"
			title="Zwei-Faktor-Anmeldung aktiv">2FA</Badge
		>{/if}
{/snippet}

{#snippet roleSelect(user: AdminUser)}
	<SearchableSelect
		options={ADMIN_ROLES}
		value={user.role}
		onSelect={(selectedRole) => setRole(user, selectedRole)}
		disabled={busy || user.id === data.user?.id}
		ariaLabel="Rolle von {user.name}"
		class="w-full max-w-48"
	/>
{/snippet}

{#snippet userActions(user: AdminUser)}
	<Button
		size="icon-sm"
		variant="ghost"
		onclick={() => (passwordUser = user)}
		disabled={busy}
		title="Neues Passwort setzen"
		aria-label="Neues Passwort setzen"><KeyIcon aria-hidden="true" /></Button
	>
	{#if data.twoFactor !== 'off' && user.twoFactorEnabled}
		<Button
			size="icon-sm"
			variant="ghost"
			onclick={() => (twoFactorUser = user)}
			disabled={busy}
			title="Zwei-Faktor-Anmeldung zurücksetzen"
			aria-label="Zwei-Faktor-Anmeldung zurücksetzen"
		>
			<ShieldOffIcon aria-hidden="true" />
		</Button>
	{/if}
	<Button
		size="icon-sm"
		variant="ghost"
		onclick={() => setBanned(user, !user.banned)}
		disabled={busy || user.id === data.user?.id}
		title={user.banned ? 'Entsperren' : 'Sperren'}
		aria-label={user.banned ? 'Entsperren' : 'Sperren'}
	>
		<BanIcon aria-hidden="true" />
	</Button>
	<Button
		size="icon-sm"
		variant="ghost"
		class="text-destructive"
		onclick={() => (toDelete = user)}
		disabled={busy || user.id === data.user?.id}
		title="Konto entfernen"
		aria-label="Konto entfernen"
	>
		<TrashIcon aria-hidden="true" />
	</Button>
{/snippet}

{#snippet revokeButton(apiKey: (typeof data.apiKeys)[number])}
	{#if !apiKey.revokedAt}
		<Button
			size="sm"
			variant="ghost"
			class="text-destructive"
			onclick={() => (keyToRevoke = apiKey)}
			disabled={busy}>Widerrufen</Button
		>
	{/if}
{/snippet}

<!-- Phones: one card per account instead of a table that does not fit. -->
<ul class="border-border divide-border divide-y rounded-lg border md:hidden">
	{#each data.users as user (user.id)}
		<li class="space-y-3 p-4 {user.banned ? 'opacity-60' : ''}">
			<div>
				<div class="font-medium">{user.name}{@render userBadges(user)}</div>
				<div class="text-muted-foreground text-sm break-all">{user.email}</div>
				<div class="text-muted-foreground mt-1 text-xs">
					Seit {formatDate(user.createdAt)} · zuletzt angemeldet {user.lastSignInAt
						? formatDateTime(user.lastSignInAt)
						: '—'}
				</div>
			</div>
			<div class="flex items-center gap-2">
				<div class="min-w-0 flex-1">{@render roleSelect(user)}</div>
				<div class="flex shrink-0 items-center gap-1">{@render userActions(user)}</div>
			</div>
		</li>
	{/each}
</ul>

<div class="hidden md:block">
	<Table.Table class="table-fixed">
		{@render columns()}
		<Table.TableHeader>
			<Table.TableRow>
				<Table.TableHead>Name</Table.TableHead>
				<Table.TableHead>E-Mail</Table.TableHead>
				<Table.TableHead>Rolle</Table.TableHead>
				<Table.TableHead>Seit</Table.TableHead>
				<Table.TableHead>Zuletzt angemeldet</Table.TableHead>
				<Table.TableHead></Table.TableHead>
			</Table.TableRow>
		</Table.TableHeader>
		<Table.TableBody>
			{#each data.users as user (user.id)}
				<Table.TableRow class={user.banned ? 'opacity-60' : ''}>
					<Table.TableCell class="font-medium break-words whitespace-normal">
						{user.name}{@render userBadges(user)}
					</Table.TableCell>
					<Table.TableCell class="truncate" title={user.email}>{user.email}</Table.TableCell>
					<Table.TableCell>{@render roleSelect(user)}</Table.TableCell>
					<Table.TableCell class="text-muted-foreground text-sm"
						>{formatDate(user.createdAt)}</Table.TableCell
					>
					<Table.TableCell class="text-muted-foreground text-sm whitespace-nowrap"
						>{user.lastSignInAt ? formatDateTime(user.lastSignInAt) : '—'}</Table.TableCell
					>
					<Table.TableCell class="text-right whitespace-nowrap"
						>{@render userActions(user)}</Table.TableCell
					>
				</Table.TableRow>
			{/each}
		</Table.TableBody>
	</Table.Table>
</div>

<section class="mt-10">
	<div class="mb-4 flex flex-wrap items-center justify-between gap-3">
		<h2 class="text-lg font-semibold">
			API-Zugänge <Badge variant="neutral" class="ms-2 align-middle">{data.apiKeys.length}</Badge>
		</h2>
		<Button variant="outline" href="/admin/users/api-keys/new"
			><PlusIcon aria-hidden="true" /> API-Zugang anlegen</Button
		>
	</div>

	{#if !data.apiKeys.length}
		<p class="text-muted-foreground text-sm">Noch keine API-Zugänge.</p>
	{:else}
		<ul class="border-border divide-border divide-y rounded-lg border md:hidden">
			{#each data.apiKeys as apiKey (apiKey.id)}
				<li class="flex items-start gap-3 p-4 {apiKey.revokedAt ? 'opacity-50' : ''}">
					<div class="min-w-0 flex-1">
						<div class="font-medium">
							{apiKey.name}
							{#if apiKey.revokedAt}<Badge variant="neutral" class="ms-2">widerrufen</Badge>{/if}
						</div>
						<div class="text-muted-foreground text-sm">
							<code class="text-xs">{apiKey.prefix}…</code> · {apiKey.role === 'admin'
								? 'Administrator'
								: 'Redakteur'}
						</div>
						<div class="text-muted-foreground mt-1 text-xs">
							Angelegt {formatDate(apiKey.createdAt)} · zuletzt genutzt {apiKey.lastUsedAt
								? formatDateTime(apiKey.lastUsedAt)
								: '—'}
						</div>
					</div>
					{@render revokeButton(apiKey)}
				</li>
			{/each}
		</ul>

		<div class="hidden md:block">
			<Table.Table class="table-fixed">
				{@render columns()}
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
					{#each data.apiKeys as apiKey (apiKey.id)}
						<Table.TableRow class={apiKey.revokedAt ? 'opacity-50' : ''}>
							<Table.TableCell class="font-medium break-words whitespace-normal">
								{apiKey.name}
								{#if apiKey.revokedAt}<Badge variant="neutral" class="ms-2">widerrufen</Badge>{/if}
							</Table.TableCell>
							<Table.TableCell><code class="text-xs">{apiKey.prefix}…</code></Table.TableCell>
							<Table.TableCell
								>{apiKey.role === 'admin' ? 'Administrator' : 'Redakteur'}</Table.TableCell
							>
							<Table.TableCell
								class="text-muted-foreground truncate text-sm"
								title={`von ${apiKey.createdBy}`}>{formatDate(apiKey.createdAt)}</Table.TableCell
							>
							<Table.TableCell class="text-muted-foreground text-sm whitespace-nowrap"
								>{apiKey.lastUsedAt ? formatDateTime(apiKey.lastUsedAt) : '—'}</Table.TableCell
							>
							<Table.TableCell class="text-right">{@render revokeButton(apiKey)}</Table.TableCell>
						</Table.TableRow>
					{/each}
				</Table.TableBody>
			</Table.Table>
		</div>
	{/if}
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
	open={passwordUser !== null}
	title="Neues Passwort setzen"
	confirmLabel="Speichern"
	cancelLabel="Abbrechen"
	loading={busy}
	onConfirm={setPassword}
	onCancel={() => {
		passwordUser = null;
		newPassword = '';
	}}
>
	<div class="grid gap-2">
		<Label for="pw-new">Passwort für {passwordUser?.email}</Label>
		<PasswordInput id="pw-new" bind:value={newPassword} generate />
	</div>
</ConfirmDialog>

<ConfirmDialog
	open={twoFactorUser !== null}
	title="Zwei-Faktor-Anmeldung zurücksetzen?"
	body={`${twoFactorUser?.email ?? ''} meldet sich danach nur mit Passwort an und kann die Authenticator-App neu einrichten.`}
	confirmLabel="Zurücksetzen"
	cancelLabel="Abbrechen"
	destructive
	loading={busy}
	onConfirm={resetSecondFactor}
	onCancel={() => (twoFactorUser = null)}
/>
