/**
 * Pure helpers for visitor statistics: everything is reduced to coarse categories
 * before it is stored, so no raw user agent, IP or full referrer URL is kept.
 */
export type Channel = 'direct' | 'search' | 'social' | 'campaign' | 'referral';
export declare function isBot(userAgent: string): boolean;
/** Path without query, fragment and trailing slash; null for anything that is not a plain site path. */
export declare function normalizePath(value: unknown): string | null;
/** Host of an external referrer without `www.`; empty for none, own host or invalid input. */
export declare function referrerHost(value: unknown, ownHost: string): string;
/** Short campaign label (utm_*): lower case, limited length. */
export declare function campaignValue(value: unknown): string;
export declare function channelOf(referrer: string, source: string): Channel;
export declare function deviceOf(userAgent: string, mobileHint: string | null): string;
export declare function browserOf(userAgent: string): string;
export declare function osOf(userAgent: string): string;
/** Primary language of the browser (`de`, `en`, …) from Accept-Language. */
export declare function languageOf(acceptLanguage: string | null): string;
/** Calendar day (YYYY-MM-DD) and hour in the given time zone. */
export declare function localTime(date: Date, timeZone: string): {
    day: string;
    hour: number;
};
/** Shifts a calendar day by whole days. */
export declare function addDays(day: string, days: number): string;
