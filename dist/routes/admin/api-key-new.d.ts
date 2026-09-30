import { type ServerLoadEvent } from '@sveltejs/kit';
/** Form page for a new API key; admins with a browser session only. */
export declare function load({ locals }: ServerLoadEvent): Promise<{
    breadcrumbs: ({
        label: string;
        href: string;
    } | {
        label: string;
        href?: undefined;
    })[];
}>;
