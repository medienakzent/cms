export const DEFAULT_CONSENT_TEXTS = {
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
export function defineConsent(input) {
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
            throw new Error(`consent: Dienst „${service.id}" verweist auf unbekannte Kategorie „${service.category}".`);
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
export function consentText(config, lang, key) {
    return (config.texts[lang]?.[key] ?? DEFAULT_CONSENT_TEXTS[lang]?.[key] ?? DEFAULT_CONSENT_TEXTS.de[key]);
}
export function localized(value, lang) {
    if (!value)
        return '';
    if (typeof value === 'string')
        return value;
    return value[lang] ?? value.de ?? Object.values(value)[0] ?? '';
}
