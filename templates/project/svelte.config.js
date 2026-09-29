import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		// Node-Server: Admin, API, Auth, Uploads und Mail laufen serverseitig — ein Prozess.
		adapter: adapter({ out: 'build' })
	}
};

export default config;
