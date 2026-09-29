import { getMigrations } from 'better-auth/db/migration';
import { getAuth } from './auth';
import { collection, reindexContent, SYSTEM_ACTOR } from './content';
import { getRuntime } from './runtime';
import { apiKeys } from './api-keys';
import { getIndex } from './index/index';
import { reindexMedia } from './media';
import { getStorage } from './storage';

let ready: Promise<void> | null = null;

/**
 * Once on the first request: index schema, auth tables, rebuild the index from
 * the storage if needed and create a sample document.
 */
export function ensureReady(): Promise<void> {
	if (!ready) {
		ready = (async () => {
			const index = await getIndex();
			const { reset } = await index.ensureSchema();
			await apiKeys.ensureSchema();
			const auth = await getAuth();
			const { runMigrations } = await getMigrations(auth.options);
			await runMigrations();

			const counts = await index.countByCollection();
			const hasContent = (await getStorage().list('content')).length > 0;
			if (!hasContent) {
				await seed();
			} else if (reset || Object.keys(counts).length === 0) {
				const result = await reindexContent();
				await reindexMedia();
				console.log(
					`[cms] Index aufgebaut: ${result.documents} Dokumente, ${result.languages} Sprachfassungen`
				);
			}
		})().catch((error) => {
			ready = null;
			throw error;
		});
	}
	return ready;
}

async function seed() {
	const { config, registry } = getRuntime();
	const home = config.routing.home;
	if (!registry.collections[home.collection] || !registry.blocks.hero || !registry.blocks.text)
		return;
	const api = collection(home.collection);
	await api.create({
		slug: home.slug,
		lang: config.defaultLanguage,
		status: 'published',
		actor: SYSTEM_ACTOR,
		input: {
			fields: { title: 'Startseite' },
			blocks: [
				{
					id: 'seed-hero',
					type: 'hero',
					data: {
						title: 'Willkommen',
						subtitle:
							'Dieses CMS rendert Seiten aus Blocks. Melde dich unter /admin an, um Inhalte zu pflegen.',
						layout: 'center'
					}
				},
				{
					id: 'seed-text',
					type: 'text',
					data: {
						body: 'Blocks liegen unter `src/blocks/<name>/`, Collections unter `src/collections/`. Die Struktur ist die einzige Quelle der Wahrheit — siehe `src/blocks/README.md`.'
					}
				}
			]
		}
	});
	console.log('[cms] Beispiel-Startseite angelegt');
}
