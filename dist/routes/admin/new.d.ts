import { type RequestEvent, type ServerLoadEvent } from '@sveltejs/kit';
export declare function load({ params, url }: ServerLoadEvent): Promise<{
    lang: string;
    def: {
        name: string;
        label: string;
        labelPlural: string;
        titleField: string;
    };
    breadcrumbs: ({
        label: string;
        href: string;
    } | {
        label: string;
        href?: undefined;
    })[];
}>;
export declare const actions: {
    default: ({ params, request, locals }: RequestEvent) => Promise<import("@sveltejs/kit").ActionFailure<{
        error: string;
        title: string;
        slug: string;
    }>>;
};
