/**
 * API rate limit: fixed window per key, kept in process memory. Multiple
 * instances behind a load balancer would need the counter in the database or
 * Redis; the interface stays the same.
 */
export interface RateLimitResult {
    ok: boolean;
    limit: number;
    remaining: number;
    /** Seconds until the window ends. */
    retryAfter: number;
}
export declare function createRateLimiter(options: {
    windowMs: number;
    max: number;
}): {
    check(key: string, now?: number): RateLimitResult;
};
