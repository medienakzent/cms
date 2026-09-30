import type { ServerLoadEvent } from '@sveltejs/kit';
import { type MailSubmission } from '../../server/mail';
export declare function load({ url }: ServerLoadEvent): Promise<{
    template: string;
    status: "all" | "sent" | "failed" | "spam";
    page: number;
    pages: number;
    total: number;
    items: MailSubmission[];
    templates: {
        name: string;
        label: string;
    }[];
    transport: "file" | "microsoft" | "google" | "smtp";
    breadcrumbs: ({
        label: string;
        href: string;
    } | {
        label: string;
        href?: undefined;
    })[];
}>;
