<script lang="ts">
	import { page } from '$app/state';
	import type { BlockProps } from '@compdata/cms';
	import { Richtext } from '@compdata/cms/render';
	import type def from './block';

	let { title, intro, template, successText, errorText }: BlockProps<typeof def> = $props();

	let status = $state<'idle' | 'sending' | 'sent' | 'error'>('idle');
	let issues = $state<Record<string, string>>({});

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		const form = e.currentTarget as HTMLFormElement;
		const data = Object.fromEntries(new FormData(form).entries());
		status = 'sending';
		issues = {};
		try {
			const res = await fetch(`/api/mail/${template || 'contact'}`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ ...data, _lang: page.data.lang ?? 'de' })
			});
			if (res.status === 422) {
				const body = (await res.json()) as { issues: { path: string; message: string }[] };
				issues = Object.fromEntries(body.issues.map((i) => [i.path, i.message]));
				status = 'idle';
				return;
			}
			if (!res.ok) throw new Error(String(res.status));
			status = 'sent';
			form.reset();
		} catch {
			status = 'error';
		}
	}
</script>

<section class="mx-auto max-w-2xl px-6 py-12">
	{#if title}<h2 class="mb-3 text-2xl font-semibold">{title}</h2>{/if}
	{#if intro}<div class="mb-6"><Richtext source={intro} /></div>{/if}

	{#if status === 'sent'}
		<p class="rounded-md border border-green-300 bg-green-50 p-4 text-green-900">{successText}</p>
	{:else}
		<form onsubmit={submit} class="grid gap-4">
			<!-- Honeypot: für Menschen unsichtbar, muss leer bleiben -->
			<div class="absolute -left-[9999px]" aria-hidden="true">
				<label>Website <input type="text" name="website" tabindex="-1" autocomplete="off" /></label>
			</div>
			<div class="grid gap-4 sm:grid-cols-2">
				<label class="grid gap-1 text-sm">
					Name *
					<input name="name" required maxlength="120" class="rounded-md border px-3 py-2" />
					{#if issues.name}<span class="text-red-600">{issues.name}</span>{/if}
				</label>
				<label class="grid gap-1 text-sm">
					E-Mail *
					<input name="email" type="email" required maxlength="200" class="rounded-md border px-3 py-2" />
					{#if issues.email}<span class="text-red-600">{issues.email}</span>{/if}
				</label>
			</div>
			<label class="grid gap-1 text-sm">
				Telefon
				<input name="phone" maxlength="60" class="rounded-md border px-3 py-2" />
			</label>
			<label class="grid gap-1 text-sm">
				Nachricht *
				<textarea name="message" required rows="6" maxlength="5000" class="rounded-md border px-3 py-2"></textarea>
				{#if issues.message}<span class="text-red-600">{issues.message}</span>{/if}
			</label>
			{#if status === 'error'}<p class="text-red-600">{errorText}</p>{/if}
			<button type="submit" disabled={status === 'sending'} class="bg-primary text-primary-foreground rounded-md px-5 py-2.5 font-medium disabled:opacity-60">
				{status === 'sending' ? 'Wird gesendet …' : 'Absenden'}
			</button>
		</form>
	{/if}
</section>
