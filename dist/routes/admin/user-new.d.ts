import { type ServerLoadEvent } from '@sveltejs/kit';
/** Form page for a new account; admins with a browser session only. */
export declare function load({ locals }: ServerLoadEvent): Promise<{
    breadcrumbs: ({
        label: string;
        href: string;
    } | {
        label: string;
        href?: undefined;
    })[];
}>;
