import type { ServerLoadEvent } from '@sveltejs/kit';
export declare function load({ url }: ServerLoadEvent): Promise<{
    counts: Record<string, number>;
    mediaCount: number;
    submissionCount: number;
    analyticsEnabled: boolean;
    analytics: import("../../server").AnalyticsReport;
    breadcrumbs: {
        label: string;
    }[];
}>;
