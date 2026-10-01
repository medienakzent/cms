import type { ServerLoadEvent } from '@sveltejs/kit';
/** "Set new password" page; the token comes from the link in the reset mail. */
export declare function load({ url }: ServerLoadEvent): Promise<{
    token: string;
    invalid: boolean;
    breadcrumbs: {
        label: string;
    }[];
}>;
