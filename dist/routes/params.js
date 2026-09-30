/** Param matcher for `[[lang=lang]]`; customer project: `export const match = createLangMatcher(registry);` */
export function createLangMatcher(registry) {
    return (param) => registry.config.languages.some((language) => language.code === param);
}
