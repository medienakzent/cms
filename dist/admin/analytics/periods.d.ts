export declare const ANALYTICS_PERIODS: readonly [1, 7, 30, 90, 365];
/** Selected period in days from `?days=`, 30 by default. */
export declare function periodOf(url: URL): number;
