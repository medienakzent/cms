/**
 * Project registry. New files in src/blocks, src/collections and src/mail are picked up
 * automatically; nothing has to be registered here. This file belongs to the project.
 */
import { defineRegistry } from '@medienakzent/cms';
import config from './cms.config';

export default defineRegistry({
	config,
	blocks: import.meta.glob('./blocks/*/block.ts', { eager: true, import: 'default' }),
	components: import.meta.glob('./blocks/*/*.svelte', { eager: true, import: 'default' }),
	collections: import.meta.glob('./collections/*.ts', { eager: true, import: 'default' }),
	content: import.meta.glob('./cms.content.ts', { eager: true, import: 'default' }),
	mail: import.meta.glob('./mail/*.ts', { eager: true, import: 'default' })
});
