/**
 * Datenschutz-Einwilligung: Kategorien, Dienste und Texte. Konfiguration in
 * `cms.config.ts` unter `consent`. Ohne optionale Dienste erscheint kein Banner.
 *
 * Dienste laden erst nach Einwilligung ihrer Kategorie; Seitenwechsel werden
 * an geladene Dienste gemeldet. Adapter: `ga4`, `matomo`, `script` aus
 * `@medienakzent/cms/forms`.
 */
export interface ConsentCategory {
	id: string;
	label: string | Record<string, string>;
	description?: string | Record<string, string>;
	/** Technisch notwendig — immer aktiv, nicht abwählbar. */
	required?: boolean;
}

export interface ConsentService {
	id: string;
	name: string;
	/** Kategorie-ID, deren Einwilligung den Dienst freischaltet. */
	category: string;
	/** Dienst laden — läuft genau einmal nach Einwilligung, nur im Browser. */
	load: () => void | Promise<void>;
	/** Seitenaufruf melden (Client-Navigation). */
	pageview?: (url: string) => void;
	/** Ereignis melden. */
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
	/** Version — erhöhen, wenn sich Dienste/Kategorien ändern; dann wird erneut gefragt. */
	version: number;
	cookieName: string;
	/** Gültigkeit der Entscheidung in Tagen. */
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
	if (!categories.some((c) => c.required)) {
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
	for (const s of input.services ?? []) {
		if (!categories.some((c) => c.id === s.category))
			throw new Error(
				`consent: Dienst „${s.id}" verweist auf unbekannte Kategorie „${s.category}".`
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
