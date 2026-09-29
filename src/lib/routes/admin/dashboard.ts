import { getIndex } from '../../server/index/index';
import { mail } from '../../server/mail';
import { getRuntime } from '../../server/runtime';

export async function load() {
	const index = await getIndex();
	const counts = await index.countByCollection();
	const media = await index.listMedia({ limit: 1 });
	const submissions = await mail.submissions({ limit: 1 });
	return {
		counts,
		mediaCount: media.total,
		submissionCount: submissions.total,
		blocks: Object.values(getRuntime().registry.blocks).map((block) => ({
			name: block.name,
			label: block.label,
			version: block.version
		})),
		breadcrumbs: [{ label: 'Übersicht' }]
	};
}
