import { type ServerLoadEvent } from '@sveltejs/kit';
/** Statistics of one website page: `/admin/analytics?path=/about&days=30`. */
export declare function load({ url }: ServerLoadEvent): Promise<{
    analyticsEnabled: boolean;
    analytics: import("../../server").AnalyticsReport;
    breadcrumbs: ({
        label: string;
        href: string;
    } | {
        label: string;
        href?: undefined;
    })[];
}>;
