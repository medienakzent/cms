<script lang="ts">
	import { enhance } from '$app/forms';
	import { slugify } from '../../slug';
	import type { load } from '../../routes/admin/new';
	import { Button } from '@compdata/ui/button';
	import { Input } from '@compdata/ui/input';
	import { Label } from '@compdata/ui/label';

	type FormResult = { error?: string; title?: string; slug?: string } | null | undefined;
	let { data, form }: { data: Awaited<ReturnType<typeof load>>; form: FormResult } = $props();

	// svelte-ignore state_referenced_locally
	let title = $state(form?.title ?? '');
	// svelte-ignore state_referenced_locally
	let slug = $state(form?.slug ?? '');
	// svelte-ignore state_referenced_locally
	let slugTouched = $state(!!form?.slug);
	const suggested = $derived(slugTouched ? slug : slugify(title));
</script>

<h1 class="mb-6 text-2xl font-semibold">{data.def.label} anlegen</h1>

<form method="post" use:enhance class="max-w-lg space-y-4">
	<input type="hidden" name="lang" value={data.lang} />
	<div class="space-y-1">
		<Label for="title">Titel ({data.lang.toUpperCase()})</Label>
		<Input id="title" name="title" bind:value={title} required />
	</div>
	<div class="space-y-1">
		<Label for="slug">Slug</Label>
		<Input
			id="slug"
			name="slug"
			value={suggested}
			oninput={(event) => {
				slug = slugify(event.currentTarget.value);
				slugTouched = true;
			}}
			pattern="[a-z0-9]([a-z0-9-]*[a-z0-9])?"
		/>
		<p class="text-muted-foreground text-xs">
			Teil der URL, für alle Sprachen gleich. Nur Kleinbuchstaben, Ziffern, Bindestriche.
		</p>
	</div>
	{#if form?.error}<p class="text-destructive text-sm">{form.error}</p>{/if}
	<div class="flex gap-2">
		<Button type="submit">Anlegen</Button>
		<Button variant="ghost" href="/admin/{data.def.name}">Abbrechen</Button>
	</div>
</form>
