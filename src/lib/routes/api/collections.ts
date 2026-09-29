import { api } from '../../server/api';
import { getRuntime } from '../../server/runtime';

/** GET /api/v1/collections: structure overview (collections, fields, blocks) */
export const GET = () =>
	api(async () => {
		const { registry, config } = getRuntime();
		return {
			languages: config.languages,
			defaultLanguage: config.defaultLanguage,
			collections: Object.values(registry.collections).map((definition) => ({
				name: definition.name,
				label: definition.label,
				labelPlural: definition.labelPlural,
				titleField: definition.titleField,
				fields: definition.fields,
				blocks: definition.blocks
			})),
			blocks: Object.values(registry.blocks).map((block) => ({
				name: block.name,
				label: block.label,
				version: block.version,
				fields: block.fields
			}))
		};
	});
