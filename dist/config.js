export function defineConfig(input) {
    const defaultLanguage = input.defaultLanguage ?? input.languages[0]?.code;
    if (!defaultLanguage || !input.languages.some((language) => language.code === defaultLanguage)) {
        throw new Error('cms.config: defaultLanguage muss in languages enthalten sein.');
    }
    return {
        site: { favicon: '/favicon.svg', ...input.site },
        consent: input.consent ?? null,
        languages: input.languages,
        defaultLanguage,
        routing: {
            localePrefix: 'except-default',
            home: { collection: 'pages', slug: 'home' },
            ...input.routing
        },
        media: {
            imageVariants: { thumb: 320, md: 960, lg: 1920 },
            imageQuality: 82,
            ...input.media
        }
    };
}
/** Public path with language prefix according to `routing.localePrefix`. */
export function localizePath(config, lang, path) {
    const clean = path.startsWith('/') ? path : `/${path}`;
    if (config.routing.localePrefix === 'except-default' && lang === config.defaultLanguage)
        return clean;
    return clean === '/' ? `/${lang}` : `/${lang}${clean}`;
}
