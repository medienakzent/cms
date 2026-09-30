import type { ServerLoadEvent } from '@sveltejs/kit';
import { periodOf } from '../../admin/analytics/periods';
import { analytics } from '../../server/analytics';
import { getIndex } from '../../server/index/index';
import { mail } from '../../server/mail';
import { serverConfig } from '../../server/runtime';

export async function load({ url }: ServerLoadEvent) {
	const index = await getIndex();
	const counts = await index.countByCollection();
	const media = await index.listMedia({ limit: 1 });
	const submissions = await mail.submissions({ limit: 1 });
	return {
		counts,
		mediaCount: media.total,
		submissionCount: submissions.total,
		analyticsEnabled: serverConfig().analytics.enabled,
		analytics: await analytics.report({ days: periodOf(url) }),
		breadcrumbs: [{ label: 'Übersicht' }]
	};
}
