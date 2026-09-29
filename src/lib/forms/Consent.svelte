<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import { onMount } from 'svelte';
	import { consentText, localized, type ConsentConfig } from '../consent';
	import { consent } from './consent-store.svelte';

	/**
	 * Datenschutz-Banner mit Einstellungen. Einmal ins Website-Layout setzen:
	 *
	 *   <Consent config={registry.config.consent} lang={data.lang} />
	 *
	 * Gestaltung: Klassen `cms-consent*` sind bewusst schlicht und über eigenes CSS
	 * überschreibbar; alternativ eigene Darstellung über die Snippets.
	 */
	type Props = { config: ConsentConfig | null | undefined; lang?: string; class?: string };
	let { config, lang = 'de', class: klass = '' }: Props = $props();

	let showSettings = $state(false);
	let draft = $state<Record<string, boolean>>({});

	const t = (key: Parameters<typeof consentText>[2]) => (config ? consentText(config, lang, key) : '');

	onMount(() => {
		if (config) consent.init(config);
	});
	afterNavigate(({ to }) => {
		if (to?.url) consent.pageview(to.url.href);
	});

	function openSettings() {
		draft = Object.fromEntries((config?.categories ?? []).map((c) => [c.id, c.required ? true : (consent.decisions?.[c.id] ?? false)]));
		showSettings = true;
	}
</script>

{#if config && consent.open}
	<div class="cms-consent {klass}" role="dialog" aria-modal="true" aria-labelledby="cms-consent-title">
		<div class="cms-consent__card">
			<h2 id="cms-consent-title" class="cms-consent__title">{t('title')}</h2>
			<p class="cms-consent__text">{t('text')}</p>

			{#if showSettings}
				<ul class="cms-consent__categories">
					{#each config.categories as c (c.id)}
						<li class="cms-consent__category">
							<label>
								<input type="checkbox" checked={c.required || draft[c.id]} disabled={c.required} onchange={(e) => (draft = { ...draft, [c.id]: e.currentTarget.checked })} />
								<span class="cms-consent__label">{localized(c.label, lang)}{#if c.required} <em>({t('required')})</em>{/if}</span>
							</label>
							{#if c.description}<p class="cms-consent__description">{localized(c.description, lang)}</p>{/if}
							{#if config.services.some((s) => s.category === c.id)}
								<p class="cms-consent__services">{config.services.filter((s) => s.category === c.id).map((s) => s.name).join(', ')}</p>
							{/if}
						</li>
					{/each}
				</ul>
			{/if}

			<div class="cms-consent__actions">
				<button type="button" class="cms-consent__btn cms-consent__btn--primary" onclick={() => consent.acceptAll()}>{t('acceptAll')}</button>
				<button type="button" class="cms-consent__btn" onclick={() => consent.rejectAll()}>{t('rejectAll')}</button>
				{#if showSettings}
					<button type="button" class="cms-consent__btn" onclick={() => consent.set(draft)}>{t('save')}</button>
				{:else}
					<button type="button" class="cms-consent__btn cms-consent__btn--link" onclick={openSettings}>{t('settings')}</button>
				{/if}
				<a href={config.privacyHref} class="cms-consent__privacy">{t('privacyLink')}</a>
			</div>
		</div>
	</div>
{/if}

<style>
	.cms-consent {
		position: fixed;
		inset: auto 0 0 0;
		z-index: 1000;
		padding: 1rem;
		display: flex;
		justify-content: center;
	}
	.cms-consent__card {
		max-width: 44rem;
		width: 100%;
		background: var(--cms-consent-bg, #fff);
		color: var(--cms-consent-fg, #111);
		border: 1px solid var(--cms-consent-border, #ddd);
		border-radius: var(--cms-consent-radius, 0.75rem);
		box-shadow: 0 12px 40px rgba(0, 0, 0, 0.18);
		padding: 1.25rem 1.5rem;
		font-size: 0.95rem;
		line-height: 1.5;
	}
	.cms-consent__title {
		margin: 0 0 0.25rem;
		font-size: 1.05rem;
		font-weight: 600;
	}
	.cms-consent__text {
		margin: 0;
	}
	.cms-consent__categories {
		list-style: none;
		margin: 1rem 0 0;
		padding: 0;
		display: grid;
		gap: 0.75rem;
	}
	.cms-consent__category label {
		display: flex;
		gap: 0.5rem;
		align-items: center;
		font-weight: 500;
	}
	.cms-consent__description,
	.cms-consent__services {
		margin: 0.15rem 0 0 1.6rem;
		font-size: 0.85rem;
		opacity: 0.75;
	}
	.cms-consent__actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		align-items: center;
		margin-top: 1rem;
	}
	.cms-consent__btn {
		border: 1px solid var(--cms-consent-fg, #111);
		background: transparent;
		color: inherit;
		border-radius: 999px;
		padding: 0.55rem 1.1rem;
		font: inherit;
		font-weight: 500;
		cursor: pointer;
	}
	.cms-consent__btn--primary {
		background: var(--cms-consent-accent, #111);
		color: var(--cms-consent-accent-fg, #fff);
		border-color: var(--cms-consent-accent, #111);
	}
	.cms-consent__btn--link {
		border-color: transparent;
		text-decoration: underline;
		padding-inline: 0.5rem;
	}
	.cms-consent__privacy {
		margin-left: auto;
		font-size: 0.85rem;
		color: inherit;
		text-decoration: underline;
	}
</style>
