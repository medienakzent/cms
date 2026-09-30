<script lang="ts">
	import { onMount } from 'svelte';
	import type { CaptchaClientConfig } from '../captcha';

	/**
	 * ALTCHA widget for forms. In the layout load: `captcha: cms.forms.captcha()`, then in
	 * the form `<Captcha config={page.data.captcha} />`. The widget writes its solution as
	 * a hidden field into the surrounding <form>; the server verifies it in mail.send.
	 * Needs a secure context (https or localhost).
	 */
	type Props = {
		/** Missing config (e.g. admin preview) renders nothing. */
		config?: CaptchaClientConfig;
		language?: string;
		class?: string;
		hideFooter?: boolean;
	};
	let { config, language = 'de', class: className = '', hideFooter = false }: Props = $props();

	// Static import map so Vite can bundle the widget translations.
	const I18N: Record<string, () => Promise<unknown>> = {
		de: () => import('altcha/i18n/de'),
		en: () => import('altcha/i18n/en'),
		it: () => import('altcha/i18n/it'),
		nl: () => import('altcha/i18n/nl'),
		pl: () => import('altcha/i18n/pl')
	};

	let host = $state<HTMLDivElement | null>(null);

	onMount(() => {
		if (!config?.enabled) return;
		// The web component is loaded in the browser only: no SSR, no external assets.
		Promise.all([import('altcha'), (I18N[language] ?? I18N.en)().catch(() => null)]).then(() => {
			if (!host || !config) return;
			const widget = document.createElement('altcha-widget');
			widget.setAttribute('challenge', config.challengeUrl);
			widget.setAttribute('name', config.fieldName);
			widget.setAttribute('language', language);
			widget.setAttribute('auto', 'onfocus');
			if (hideFooter) widget.setAttribute('hidefooter', '');
			host.replaceChildren(widget);
		});
	});
</script>

{#if config?.enabled}
	<div bind:this={host} class="cms-captcha {className}"></div>
{/if}
