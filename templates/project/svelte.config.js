import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		// Node server: admin, API, auth, uploads and mail run server-side in one process.
		adapter: adapter({ out: 'build' })
	}
};

export default config;
