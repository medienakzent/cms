/**
 * Rate-Limit für die API: festes Fenster pro Schlüssel, im Prozessspeicher.
 * Für mehrere Instanzen hinter einem Load-Balancer müsste der Zähler in die
 * Datenbank oder nach Redis — die Schnittstelle bleibt gleich.
 */
export interface RateLimitResult {
	ok: boolean;
	limit: number;
	remaining: number;
	/** Sekunden bis zum Fensterende. */
	retryAfter: number;
}

export function createRateLimiter(opts: { windowMs: number; max: number }) {
	const buckets = new Map<string, { count: number; resetAt: number }>();
	let lastSweep = Date.now();

	function sweep(now: number) {
		if (now - lastSweep < opts.windowMs) return;
		lastSweep = now;
		for (const [key, b] of buckets) if (b.resetAt <= now) buckets.delete(key);
	}

	return {
		check(key: string, now = Date.now()): RateLimitResult {
			sweep(now);
			let b = buckets.get(key);
			if (!b || b.resetAt <= now) {
				b = { count: 0, resetAt: now + opts.windowMs };
				buckets.set(key, b);
			}
			b.count += 1;
			const remaining = Math.max(opts.max - b.count, 0);
			return {
				ok: b.count <= opts.max,
				limit: opts.max,
				remaining,
				retryAfter: Math.max(Math.ceil((b.resetAt - now) / 1000), 1)
			};
		}
	};
}
