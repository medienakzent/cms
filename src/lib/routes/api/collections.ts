import { api } from '../../server/api';
import { getRuntime } from '../../server/runtime';

/** GET /api/v1/collections — Struktur-Auskunft: Collections, Felder, Blocks. */
export const GET = () =>
	api(async () => {
		const { registry, config } = getRuntime();
		return {
			languages: config.languages,
			defaultLanguage: config.defaultLanguage,
			collections: Object.values(registry.collections).map((c) => ({
				name: c.name,
				label: c.label,
				labelPlural: c.labelPlural,
				titleField: c.titleField,
				fields: c.fields,
				blocks: c.blocks
			})),
			blocks: Object.values(registry.blocks).map((b) => ({ name: b.name, label: b.label, version: b.version, fields: b.fields }))
		};
	});
