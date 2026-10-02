<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import { onMount } from 'svelte';
	import { consentText, localized, type ConsentConfig } from '../consent';
	import { consent } from './consent-store.svelte';

	/**
	 * Privacy banner with settings. Place once in the website layout:
	 *
	 *   <Consent config={registry.config.consent} lang={data.lang} />
	 *
	 * The `cms-consent*` classes are deliberately plain and overridable with custom CSS.
	 */
	type Props = { config: ConsentConfig | null | undefined; lang?: string; class?: string };
	let { config, lang = 'de', class: className = '' }: Props = $props();

	let showSettings = $state(false);
	/** The admin's live preview renders the site layout; no banner and no tracking there. */
	let inPreview = $state(false);
	let draft = $state<Record<string, boolean>>({});

	const text = (key: Parameters<typeof consentText>[2]) =>
		config ? consentText(config, lang, key) : '';

	onMount(() => {
		inPreview = location.pathname.endsWith('/cms-preview');
		if (config && !inPreview) consent.init(config);
	});
	afterNavigate(({ to }) => {
		if (to?.url) consent.pageview(to.url.href);
	});

	function openSettings() {
		draft = Object.fromEntries(
			(config?.categories ?? []).map((category) => [
				category.id,
				category.required ? true : (consent.decisions?.[category.id] ?? false)
			])
		);
		showSettings = true;
	}
</script>

{#if config && consent.open && !inPreview}
	<div
		class="cms-consent {className}"
		role="dialog"
		aria-modal="true"
		aria-labelledby="cms-consent-title"
	>
		<div class="cms-consent__card">
			<h2 id="cms-consent-title" class="cms-consent__title">{text('title')}</h2>
			<p class="cms-consent__text">{text('text')}</p>

			{#if showSettings}
				<ul class="cms-consent__categories">
					{#each config.categories as category (category.id)}
						<li class="cms-consent__category">
							<label>
								<input
									type="checkbox"
									checked={category.required || draft[category.id]}
									disabled={category.required}
									onchange={(event) =>
										(draft = { ...draft, [category.id]: event.currentTarget.checked })}
								/>
								<span class="cms-consent__label"
									>{localized(category.label, lang)}{#if category.required}
										<em>({text('required')})</em>{/if}</span
								>
							</label>
							{#if category.description}<p class="cms-consent__description">
									{localized(category.description, lang)}
								</p>{/if}
							{#if config.services.some((service) => service.category === category.id)}
								<p class="cms-consent__services">
									{config.services
										.filter((service) => service.category === category.id)
										.map((service) => service.name)
										.join(', ')}
								</p>
							{/if}
						</li>
					{/each}
				</ul>
			{/if}

			<div class="cms-consent__actions">
				<button
					type="button"
					class="cms-consent__btn cms-consent__btn--primary"
					onclick={() => consent.acceptAll()}>{text('acceptAll')}</button
				>
				<button type="button" class="cms-consent__btn" onclick={() => consent.rejectAll()}
					>{text('rejectAll')}</button
				>
				{#if showSettings}
					<button type="button" class="cms-consent__btn" onclick={() => consent.set(draft)}
						>{text('save')}</button
					>
				{:else}
					<button
						type="button"
						class="cms-consent__btn cms-consent__btn--link"
						onclick={openSettings}>{text('settings')}</button
					>
				{/if}
				<a href={config.privacyHref} class="cms-consent__privacy">{text('privacyLink')}</a>
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
