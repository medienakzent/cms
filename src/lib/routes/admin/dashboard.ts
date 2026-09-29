import { getIndex } from '../../server/index/index';
import { getRuntime } from '../../server/runtime';

export async function load() {
	const index = await getIndex();
	const counts = await index.countByCollection();
	const media = await index.listMedia({ limit: 1 });
	return {
		counts,
		mediaCount: media.total,
		blocks: Object.values(getRuntime().registry.blocks).map((b) => ({ name: b.name, label: b.label, version: b.version })),
		breadcrumbs: [{ label: 'Übersicht' }]
	};
}
