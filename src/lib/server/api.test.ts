import { describe, expect, it } from 'vitest';
import { CmsError } from './errors';
import { limitRequestBody, parseDocumentBody } from './api';

function streamOf(...chunks: Uint8Array[]): ReadableStream<Uint8Array> {
	return new ReadableStream({
		start(controller) {
			for (const chunk of chunks) controller.enqueue(chunk);
			controller.close();
		}
	});
}

describe('limitRequestBody', () => {
	it('passes bodies within the limit through', async () => {
		const request = new Request('http://cms.test/', {
			method: 'POST',
			body: streamOf(new TextEncoder().encode('{"a":1}')),
			duplex: 'half'
		} as RequestInit);
		expect(await limitRequestBody(request, 100).json()).toEqual({ a: 1 });
	});

	it('rejects with 413 once the limit is exceeded, without content-length', async () => {
		const request = new Request('http://cms.test/', {
			method: 'POST',
			body: streamOf(new Uint8Array(60), new Uint8Array(60)),
			duplex: 'half'
		} as RequestInit);
		await expect(limitRequestBody(request, 100).arrayBuffer()).rejects.toMatchObject({
			status: 413
		});
	});

	it('leaves requests without a body untouched', () => {
		const request = new Request('http://cms.test/');
		expect(limitRequestBody(request, 10)).toBe(request);
	});
});

describe('parseDocumentBody', () => {
	it('accepts a minimal document', () => {
		expect(parseDocumentBody({ fields: { title: 'x' } })).toEqual({
			fields: { title: 'x' },
			blocks: [],
			status: undefined
		});
	});

	it('rejects malformed blocks with paths', () => {
		expect(() => parseDocumentBody({ blocks: [{ data: {} }] })).toThrowError(CmsError);
		try {
			parseDocumentBody({ blocks: [{ type: 'text', id: 'bad id' }], status: 'x' });
		} catch (error) {
			expect((error as CmsError).issues?.map((issue) => issue.path)).toEqual([
				'blocks[0].id',
				'status'
			]);
		}
	});
});
