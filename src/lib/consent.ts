/**
 * Privacy consent: categories, services and texts, configured in `cms.config.ts` under
 * `consent`. Without optional services no banner is shown.
 *
 * Services load only after consent for their category; page changes are reported to
 * loaded services. Adapters: `ga4`, `matomo`, `script` from `@medienakzent/cms/forms`.
 */
export interface ConsentCategory {
	id: string;
	label: string | Record<string, string>;
	description?: string | Record<string, string>;
	/** Technically necessary: always on, cannot be deselected. */
	required?: boolean;
}

export interface ConsentService {
	id: string;
	name: string;
	/** Category id whose consent enables the service. */
	category: string;
	/** Loads the service; runs exactly once after consent, browser only. */
	load: () => void | Promise<void>;
	/** Reports a page view (client navigation). */
	pageview?: (url: string) => void;
	event?: (name: string, props?: Record<string, unknown>) => void;
}

export interface ConsentTexts {
	title: string;
	text: string;
	acceptAll: string;
	rejectAll: string;
	settings: string;
	save: string;
	required: string;
	privacyLink: string;
}

export interface ConsentConfig {
	/** Bump when services or categories change; visitors are then asked again. */
	version: number;
	cookieName: string;
	/** Validity of the decision in days. */
	days: number;
	privacyHref: string;
	categories: ConsentCategory[];
	services: ConsentService[];
	texts: Record<string, Partial<ConsentTexts>>;
}

export type ConsentDecisions = Record<string, boolean>;

export const DEFAULT_CONSENT_TEXTS: Record<string, ConsentTexts> = {
	de: {
		title: 'Datenschutz-Einstellungen',
		text: 'Wir verwenden Cookies und ähnliche Techniken. Einige sind technisch notwendig, andere helfen uns, die Website zu verbessern. Sie können Ihre Auswahl jederzeit ändern.',
		acceptAll: 'Alle akzeptieren',
		rejectAll: 'Nur notwendige',
		settings: 'Einstellungen',
		save: 'Auswahl speichern',
		required: 'immer aktiv',
		privacyLink: 'Datenschutzerklärung'
	},
	en: {
		title: 'Privacy settings',
		text: 'We use cookies and similar technologies. Some are technically necessary, others help us improve the website. You can change your choice at any time.',
		acceptAll: 'Accept all',
		rejectAll: 'Necessary only',
		settings: 'Settings',
		save: 'Save selection',
		required: 'always on',
		privacyLink: 'Privacy policy'
	}
};

export function defineConsent(
	input: Partial<ConsentConfig> & { categories?: ConsentCategory[]; services?: ConsentService[] }
): ConsentConfig {
	const categories = input.categories ?? [];
	if (!categories.some((category) => category.required)) {
		categories.unshift({
			id: 'necessary',
			label: { de: 'Notwendig', en: 'Necessary' },
			description: {
				de: 'Für den Betrieb der Website erforderlich.',
				en: 'Required for the website to work.'
			},
			required: true
		});
	}
	for (const service of input.services ?? []) {
		if (!categories.some((category) => category.id === service.category))
			throw new Error(
				`consent: Dienst „${service.id}" verweist auf unbekannte Kategorie „${service.category}".`
			);
	}
	return {
		version: input.version ?? 1,
		cookieName: input.cookieName ?? 'cms_consent',
		days: input.days ?? 180,
		privacyHref: input.privacyHref ?? '/datenschutz',
		categories,
		services: input.services ?? [],
		texts: input.texts ?? {}
	};
}

export function consentText(config: ConsentConfig, lang: string, key: keyof ConsentTexts): string {
	return (
		config.texts[lang]?.[key] ?? DEFAULT_CONSENT_TEXTS[lang]?.[key] ?? DEFAULT_CONSENT_TEXTS.de[key]
	);
}

export function localized(
	value: string | Record<string, string> | undefined,
	lang: string
): string {
	if (!value) return '';
	if (typeof value === 'string') return value;
	return value[lang] ?? value.de ?? Object.values(value)[0] ?? '';
}
