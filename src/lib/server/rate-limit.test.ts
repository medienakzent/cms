import { describe, expect, it, vi } from 'vitest';
import { createRateLimiter } from './rate-limit';

describe('createRateLimiter', () => {
	it('allows max requests per window and then blocks', () => {
		vi.useFakeTimers();
		const limiter = createRateLimiter({ windowMs: 1000, max: 2 });
		expect(limiter.check('a').ok).toBe(true);
		expect(limiter.check('a').ok).toBe(true);
		const blocked = limiter.check('a');
		expect(blocked.ok).toBe(false);
		expect(blocked.retryAfter).toBeGreaterThan(0);
		expect(limiter.check('b').ok).toBe(true);
		vi.advanceTimersByTime(1001);
		expect(limiter.check('a').ok).toBe(true);
		vi.useRealTimers();
	});
});
