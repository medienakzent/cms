import type { ServerLoadEvent } from '@sveltejs/kit';
export declare function load({ locals }: ServerLoadEvent): Promise<{
    user: any;
    collections: import("../../admin").AdminCollection[];
    languages: import("../..").LanguageConfig[];
    defaultLanguage: string;
    siteName: string;
    siteFavicon: string;
    auth: {
        signup: boolean;
        twoFactor: "required" | "optional" | "off";
        providers: ("github" | "microsoft" | "google")[];
    };
}>;
export type AdminLayoutData = Awaited<ReturnType<typeof load>>;
