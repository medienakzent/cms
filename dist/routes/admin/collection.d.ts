import { type ServerLoadEvent } from '@sveltejs/kit';
import type { IndexRow } from '../../types';
export declare function load({ params, url }: ServerLoadEvent): Promise<{
    lang: string;
    q: string;
    def: {
        name: string;
        label: string;
        labelPlural: string;
    };
    rows: {
        row: IndexRow;
        langs: IndexRow[];
    }[];
    breadcrumbs: ({
        label: string;
        href: string;
    } | {
        label: string;
        href?: undefined;
    })[];
}>;
