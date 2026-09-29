/**
 * Registry des Projekts: sammelt Blocks, Collections und Mail-Vorlagen ein.
 * Neue Dateien in src/blocks, src/collections, src/mail werden automatisch erkannt —
 * hier muss nichts registriert werden. Diese Datei gehört dem Projekt.
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
