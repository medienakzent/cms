export interface VisitorRequest {
    ip: string;
    userAgent: string;
    acceptLanguage: string | null;
    mobileHint: string | null;
    host: string;
    /** Do Not Track or Global Privacy Control set by the browser. */
    optOut: boolean;
}
export interface ViewSignal {
    path?: unknown;
    referrer?: unknown;
    source?: unknown;
    medium?: unknown;
    campaign?: unknown;
}
export interface Breakdown {
    label: string;
    count: number;
}
export interface PageRow {
    path: string;
    views: number;
    sessions: number;
    averageSeconds: number;
}
export interface Totals {
    views: number;
    sessions: number;
    bounces: number;
    averageSeconds: number;
}
export type Granularity = 'hour' | 'day' | 'week' | 'month';
export interface TimelineBucket {
    /** Hour (`0`–`23`), day, first day of the week (Monday) or month (`YYYY-MM`). */
    key: string;
    views: number;
    sessions: number;
}
export interface LiveSnapshot {
    activeNow: number;
    /** Pages currently viewed, by the last page of each active visit. */
    pages: Breakdown[];
}
export interface AnalyticsReport {
    days: number;
    from: string;
    to: string;
    path: string | null;
    /** Visits with a page view in the last five minutes (whole site only). */
    activeNow: number;
    totals: Totals & {
        entries: number;
        exits: number;
    };
    previous: Totals;
    /** Bars of the history chart; the bucket size follows the period. */
    granularity: Granularity;
    timeline: TimelineBucket[];
    hours: number[];
    pages: PageRow[];
    entryPages: Breakdown[];
    exitPages: Breakdown[];
    channels: Breakdown[];
    referrers: Breakdown[];
    campaigns: Breakdown[];
    devices: Breakdown[];
    browsers: Breakdown[];
    systems: Breakdown[];
    languages: Breakdown[];
    depth: Breakdown[];
    /** Most frequent steps from one page to the next. */
    transitions: {
        from: string;
        to: string;
        count: number;
    }[];
    /** Per page: where visitors came from and where they went next. */
    cameFrom: Breakdown[];
    wentTo: Breakdown[];
}
/** Visits with a page view in the last five minutes. */
declare function activeCount(): number;
declare function liveSnapshot(): LiveSnapshot;
type LiveListener = (snapshot: LiveSnapshot) => void;
export declare const analytics: {
    ensureSchema(): Promise<void>;
    /** Records a page view; returns the view id for the later reading-time signal, or null if ignored. */
    recordView(signal: ViewSignal, request: VisitorRequest): Promise<string | null>;
    /** Visible reading time of a view, reported cumulatively by the browser. */
    recordReadingTime(viewId: unknown, seconds: unknown, request: VisitorRequest): Promise<void>;
    /** Report for the last `days` days, for the whole site or one path. */
    report(options: {
        days: number;
        path?: string | null;
    }): Promise<AnalyticsReport>;
    activeNow: typeof activeCount;
    live: typeof liveSnapshot;
    /** Live updates of the active visits; returns the unsubscribe function. */
    subscribe(listener: LiveListener): () => void;
};
export {};
