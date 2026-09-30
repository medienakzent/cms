import { type ServerLoadEvent } from '@sveltejs/kit';
/** Second factor of the signed-in user: set up, renew backup codes, switch off. */
export declare function load({ locals }: ServerLoadEvent): Promise<{
    mode: "required" | "optional";
    enabled: boolean;
    passwordLogin: boolean;
    breadcrumbs: ({
        label: string;
        href: string;
    } | {
        label: string;
        href?: undefined;
    })[];
}>;
