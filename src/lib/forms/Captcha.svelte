<script lang="ts">
	import { onMount } from 'svelte';
	import type { CaptchaClientConfig } from '../captcha';

	/**
	 * ALTCHA-Widget für Formulare. Im Layout-Load: `captcha: cms.forms.captcha()`,
	 * dann im Formular `<Captcha config={page.data.captcha} />`. Das Widget trägt
	 * seine Lösung als verstecktes Feld ins umgebende <form> ein; die Prüfung
	 * macht der Server in mail.send. Braucht einen sicheren Kontext (https oder localhost).
	 */
	type Props = {
		config: CaptchaClientConfig;
		language?: string;
		class?: string;
		hideFooter?: boolean;
	};
	let { config, language = 'de', class: klass = '', hideFooter = false }: Props = $props();

	// Übersetzungen des Widgets — statisch, damit Vite sie bündeln kann.
	const I18N: Record<string, () => Promise<unknown>> = {
		de: () => import('altcha/i18n/de'),
		en: () => import('altcha/i18n/en'),
		it: () => import('altcha/i18n/it'),
		nl: () => import('altcha/i18n/nl'),
		pl: () => import('altcha/i18n/pl')
	};

	let host = $state<HTMLDivElement | null>(null);

	onMount(() => {
		if (!config.enabled) return;
		// Widget (Web Component) erst im Browser laden — kein SSR, keine externen Assets.
		Promise.all([import('altcha'), (I18N[language] ?? I18N.en)().catch(() => null)]).then(() => {
			if (!host) return;
			const el = document.createElement('altcha-widget');
			el.setAttribute('challenge', config.challengeUrl);
			el.setAttribute('name', config.fieldName);
			el.setAttribute('language', language);
			el.setAttribute('auto', 'onfocus');
			if (hideFooter) el.setAttribute('hidefooter', '');
			host.replaceChildren(el);
		});
	});
</script>

{#if config.enabled}
	<div bind:this={host} class="cms-captcha {klass}"></div>
{/if}
