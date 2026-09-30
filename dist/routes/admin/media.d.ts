import type { ServerLoadEvent } from '@sveltejs/kit';
export declare function load({ url }: ServerLoadEvent): Promise<{
    media: {
        items: import("../..").MediaItem[];
        total: number;
    };
    q: string;
    breadcrumbs: ({
        label: string;
        href: string;
    } | {
        label: string;
        href?: undefined;
    })[];
}>;
