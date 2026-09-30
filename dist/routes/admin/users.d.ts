import { type ServerLoadEvent } from '@sveltejs/kit';
export interface AdminUser {
    id: string;
    name: string;
    email: string;
    role: string;
    createdAt: string;
    banned: boolean;
    twoFactorEnabled: boolean;
}
/** User list, admins only (the auth plugin checks this as well). */
export declare function load({ locals, request }: ServerLoadEvent): Promise<{
    users: AdminUser[];
    twoFactor: "required" | "optional" | "off";
    apiKeys: import("../../server").ApiKeyInfo[];
    breadcrumbs: ({
        label: string;
        href: string;
    } | {
        label: string;
        href?: undefined;
    })[];
}>;
