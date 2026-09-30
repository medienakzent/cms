/** Shared formatting helpers for admin pages and mail rendering (German locale). */
export declare function formatBytes(bytes: number): string;
export declare function formatDate(iso: string): string;
export declare function formatDateTime(iso: string, dateStyle?: 'medium' | 'long'): string;
export declare function formatCount(count: number, singular: string, plural: string): string;
export declare function formatNumber(value: number, maximumFractionDigits?: number): string;
export declare function formatPercent(part: number, total: number): string;
/** Duration as `45 s` or `3:07 min`. */
export declare function formatDuration(seconds: number): string;
