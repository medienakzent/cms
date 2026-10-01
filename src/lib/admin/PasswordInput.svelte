<script lang="ts">
	import { Button } from '@compdata/ui/button';
	import { Input } from '@compdata/ui/input';
	import EyeIcon from '@lucide/svelte/icons/eye';
	import EyeOffIcon from '@lucide/svelte/icons/eye-off';
	import CopyIcon from '@lucide/svelte/icons/copy';
	import WandIcon from '@lucide/svelte/icons/wand-sparkles';
	import { toast } from 'svelte-sonner';
	import { generatePassword } from './password';

	type Props = {
		value: string;
		id: string;
		required?: boolean;
		minlength?: number;
		autocomplete?: 'new-password' | 'current-password';
		/** Offer a generated password (new accounts, new passwords). */
		generate?: boolean;
		invalid?: boolean;
	};

	let {
		value = $bindable(),
		id,
		required = false,
		minlength = 8,
		autocomplete = 'new-password',
		generate = false,
		invalid = false
	}: Props = $props();

	let visible = $state(false);

	function fill() {
		value = generatePassword();
		// A generated password has to be passed on, so it is shown right away.
		visible = true;
	}

	async function copy() {
		try {
			await navigator.clipboard.writeText(value);
			toast.success('Passwort kopiert');
		} catch {
			toast.error('Kopieren nicht möglich');
		}
	}
</script>

<div class="space-y-2">
	<div class="relative">
		<Input
			{id}
			type={visible ? 'text' : 'password'}
			bind:value
			{required}
			{minlength}
			{autocomplete}
			aria-invalid={invalid || undefined}
			spellcheck="false"
			autocapitalize="off"
			class="pe-20 {visible ? 'font-mono' : ''}"
		/>
		<div class="absolute inset-y-0 end-1 flex items-center gap-0.5">
			{#if value}
				<Button
					type="button"
					size="icon-sm"
					variant="ghost"
					onclick={copy}
					title="Passwort kopieren"
					aria-label="Passwort kopieren"><CopyIcon aria-hidden="true" /></Button
				>
			{/if}
			<Button
				type="button"
				size="icon-sm"
				variant="ghost"
				onclick={() => (visible = !visible)}
				title={visible ? 'Passwort ausblenden' : 'Passwort anzeigen'}
				aria-label={visible ? 'Passwort ausblenden' : 'Passwort anzeigen'}
				aria-pressed={visible}
				aria-controls={id}
			>
				{#if visible}<EyeOffIcon aria-hidden="true" />{:else}<EyeIcon aria-hidden="true" />{/if}
			</Button>
		</div>
	</div>
	{#if generate}
		<Button type="button" size="sm" variant="outline" onclick={fill}
			><WandIcon aria-hidden="true" /> Sicheres Passwort generieren</Button
		>
	{/if}
</div>
