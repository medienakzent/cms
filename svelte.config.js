import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/**
 * Paket-Repo: src/lib ist das Paket (@compdata/cms), src/routes die Spielwiese
 * (ein Beispiel-Kundenprojekt). Der Alias lässt die Spielwiese das Paket genau so
 * importieren wie ein Kundenprojekt.
 */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter({ out: 'build' }),
		alias: { '@compdata/cms': 'src/lib' }
	}
};

export default config;
