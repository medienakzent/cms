import { describe, expect, it, vi } from 'vitest';
import { createHandleError } from './hooks';

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
