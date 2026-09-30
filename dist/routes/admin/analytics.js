import { redirect } from '@sveltejs/kit';
import { periodOf } from '../../admin/analytics/periods';
import { analytics } from '../../server/analytics';
import { normalizePath } from '../../server/analytics/classify';
import { serverConfig } from '../../server/runtime';
/** Statistics of one website page: `/admin/analytics?path=/about&days=30`. */
export async function load({ url }) {
    const path = normalizePath(url.searchParams.get('path'));
    if (!path)
        redirect(303, '/admin');
    return {
        analyticsEnabled: serverConfig().analytics.enabled,
        analytics: await analytics.report({ days: periodOf(url), path }),
        breadcrumbs: [{ label: 'Übersicht', href: '/admin' }, { label: `Statistik ${path}` }]
    };
}
