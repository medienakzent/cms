export function createRateLimiter(options) {
    const buckets = new Map();
    let lastSweep = Date.now();
    function sweep(now) {
        if (now - lastSweep < options.windowMs)
            return;
        lastSweep = now;
        for (const [key, bucket] of buckets)
            if (bucket.resetAt <= now)
                buckets.delete(key);
    }
    return {
        check(key, now = Date.now()) {
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
