import { getIndex } from '../../server/index/index';
import { mail } from '../../server/mail';

export async function load() {
	const index = await getIndex();
	const counts = await index.countByCollection();
	const media = await index.listMedia({ limit: 1 });
	const submissions = await mail.submissions({ limit: 1 });
	return {
		counts,
		mediaCount: media.total,
		submissionCount: submissions.total,
		breadcrumbs: [{ label: 'Übersicht' }]
	};
}
