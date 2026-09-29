import type { ParamMatcher } from '@sveltejs/kit';
import type { Registry } from '../registry';

/** Param matcher for `[[lang=lang]]`; customer project: `export const match = createLangMatcher(registry);` */
export function createLangMatcher(registry: Registry): ParamMatcher {
	return (param) => registry.config.languages.some((language) => language.code === param);
}
