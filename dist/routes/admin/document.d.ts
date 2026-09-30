import { type ServerLoadEvent } from '@sveltejs/kit';
export declare function load({ params, url }: ServerLoadEvent): Promise<{
    lang: string;
    collection: import("../../admin").AdminCollection;
    blockDefs: Record<string, import("../../admin").AdminBlock>;
    doc: import("../..").Document<import("../..").FieldMap>;
    exists: boolean;
    versions: import("../..").VersionInfo[];
    previewHref: string | null;
    breadcrumbs: ({
        label: string;
        href: string;
    } | {
        label: string;
        href?: undefined;
    })[];
}>;
