import type { ParamMatcher } from '@sveltejs/kit';
import type { Registry } from '../registry';

/** Param-Matcher `[[lang=lang]]` — im Kundenprojekt: `export const match = createLangMatcher(registry);` */
export function createLangMatcher(registry: Registry): ParamMatcher {
	return (param) => registry.config.languages.some((l) => l.code === param);
}
