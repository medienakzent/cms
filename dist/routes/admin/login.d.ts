import { type ServerLoadEvent } from '@sveltejs/kit';
export declare function load({ locals, url }: ServerLoadEvent): Promise<{
    returnTo: string;
    signup: boolean;
    breadcrumbs: {
        label: string;
    }[];
}>;
