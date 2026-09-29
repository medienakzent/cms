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

export function createRateLimiter(options: { windowMs: number; max: number }) {
	const buckets = new Map<string, { count: number; resetAt: number }>();
	let lastSweep = Date.now();

	function sweep(now: number) {
		if (now - lastSweep < options.windowMs) return;
		lastSweep = now;
		for (const [key, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(key);
	}

	return {
		check(key: string, now = Date.now()): RateLimitResult {
			sweep(now);
			let bucket = buckets.get(key);
			if (!bucket || bucket.resetAt <= now) {
				bucket = { count: 0, resetAt: now + options.windowMs };
				buckets.set(key, bucket);
			}
			bucket.count += 1;
			const remaining = Math.max(options.max - bucket.count, 0);
			return {
				ok: bucket.count <= options.max,
				limit: options.max,
				remaining,
				retryAfter: Math.max(Math.ceil((bucket.resetAt - now) / 1000), 1)
			};
		}
	};
}
