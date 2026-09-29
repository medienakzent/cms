<script lang="ts">
	import { onMount } from 'svelte';
	import type { CaptchaClientConfig } from '../captcha';

	/**
	 * Captcha-Widget für Formulare. Im Layout: `captcha={data.captcha}` aus
	 * `cms.forms.captcha()`. Trägt sein Ergebnis als verstecktes Feld in das
	 * umgebende <form> ein; die Prüfung macht der Server in mail.send.
	 *
	 *   <Captcha config={captcha} />
	 */
	type Props = { config: CaptchaClientConfig; language?: string; class?: string; hideFooter?: boolean };
	let { config, language = 'de', class: klass = '', hideFooter = false }: Props = $props();

	// Übersetzungen des ALTCHA-Widgets — statisch, damit Vite sie bündeln kann.
	const I18N: Record<string, () => Promise<unknown>> = {
		de: () => import('altcha/i18n/de'),
		en: () => import('altcha/i18n/en'),
		it: () => import('altcha/i18n/it'),
		nl: () => import('altcha/i18n/nl'),
		pl: () => import('altcha/i18n/pl')
	};

	let host = $state<HTMLDivElement | null>(null);

	onMount(() => {
		if (config.provider === 'altcha') {
			// Widget (Web Component) erst im Browser laden — kein SSR, keine externen Assets.
			// Übersetzung des Widgets mitladen (fällt bei unbekannter Sprache auf Englisch zurück).
			Promise.all([import('altcha'), (I18N[language] ?? I18N.en)().catch(() => null)]).then(() => {
				if (!host) return;
				const el = document.createElement('altcha-widget');
				el.setAttribute('challenge', config.challengeUrl ?? '/api/captcha/challenge');
				el.setAttribute('name', config.fieldName);
				el.setAttribute('language', language);
				el.setAttribute('auto', 'onfocus');
				if (hideFooter) el.setAttribute('hidefooter', '');
				host.replaceChildren(el);
			});
		} else if (config.provider === 'turnstile' && config.siteKey) {
			const render = () => {
				const ts = (window as unknown as { turnstile?: { render: (el: HTMLElement, o: Record<string, string>) => void } }).turnstile;
				if (ts && host) ts.render(host, { sitekey: config.siteKey!, language, 'response-field-name': config.fieldName });
			};
			if (document.querySelector('script[data-turnstile]')) render();
			else {
				const s = document.createElement('script');
				s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
				s.async = true;
				s.dataset.turnstile = '1';
				s.onload = render;
				document.head.appendChild(s);
			}
		}
	});
</script>

{#if config.provider !== 'none'}
	<div bind:this={host} class="cms-captcha {klass}" data-provider={config.provider}></div>
{/if}
