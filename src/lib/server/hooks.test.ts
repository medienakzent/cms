import { describe, expect, it, vi } from 'vitest';
import { createHandleError, limitLinkHeader } from './hooks';

type ErrorInput = Parameters<ReturnType<typeof createHandleError>>[0];

const input = (error: unknown, status = 500) =>
	({ error, status, message: 'Internal Error', event: {} }) as unknown as ErrorInput;

describe('createHandleError', () => {
	it('keeps the generic message without DEBUG_ERRORS', () => {
		const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
		const handleError = createHandleError({ env: {} });
		expect(handleError(input(new Error('secret path /var/www')))).toEqual({
			message: 'Internal Error'
		});
		expect(log).toHaveBeenCalledOnce();
		log.mockRestore();
	});

	it('shows message and stack with DEBUG_ERRORS=1', () => {
		const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
		const handleError = createHandleError({ env: { DEBUG_ERRORS: '1' } });
		const result = handleError(input(new Error('database locked')));
		expect(result).toMatchObject({ message: expect.stringContaining('Error: database locked') });
		log.mockRestore();
	});

	it('leaves not found responses alone', () => {
		const handleError = createHandleError({ env: { DEBUG_ERRORS: '1' } });
		expect(handleError(input(new Error('Not found: /x'), 404))).toEqual({
			message: 'Internal Error'
		});
	});
});

describe('limitLinkHeader', () => {
	const entry = (index: number) =>
		`</_app/immutable/chunks/chunk-${String(index).padStart(3, '0')}.js>; rel="modulepreload"; nopush`;

	it('keeps short headers untouched', () => {
		const response = new Response(null, { headers: { link: entry(1) } });
		expect(limitLinkHeader(response).headers.get('link')).toBe(entry(1));
	});

	it('cuts long headers after the entries that fit, in order', () => {
		const entries = Array.from({ length: 80 }, (_, index) => entry(index));
		const response = limitLinkHeader(new Response(null, { headers: { link: entries.join(', ') } }));
		const link = response.headers.get('link') ?? '';
		expect(link.length).toBeLessThanOrEqual(2048);
		expect(link.startsWith(entries[0])).toBe(true);
		expect(entries.slice(0, link.split(', ').length).join(', ')).toBe(link);
	});
});
