import { type ServerLoadEvent } from '@sveltejs/kit';
export declare function load({ params }: ServerLoadEvent): Promise<{
    sub: import("../../server").MailSubmission;
    labels: Record<string, string>;
    templateLabel: string;
    breadcrumbs: ({
        label: string;
        href: string;
    } | {
        label: string;
        href?: undefined;
    })[];
}>;
