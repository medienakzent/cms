import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mediaFileResponse, parseRange } from './media-response';
import { FsStorage } from './storage/fs';
import type { StorageAdapter } from './storage';

describe('parseRange', () => {
	it('ignores missing, malformed, multi-range and foreign-unit headers', () => {
		expect(parseRange(null, 100)).toEqual({ kind: 'none' });
		expect(parseRange('bytes=-', 100)).toEqual({ kind: 'none' });
		expect(parseRange('bytes=abc', 100)).toEqual({ kind: 'none' });
		expect(parseRange('bytes=0-1,5-9', 100)).toEqual({ kind: 'none' });
		expect(parseRange('items=0-1', 100)).toEqual({ kind: 'none' });
		expect(parseRange('bytes=9-3', 100)).toEqual({ kind: 'none' });
	});

	it('reads closed, open and suffix ranges and clamps to the file size', () => {
		expect(parseRange('bytes=0-9', 100)).toEqual({ kind: 'range', range: { start: 0, end: 9 } });
		expect(parseRange('bytes=90-', 100)).toEqual({ kind: 'range', range: { start: 90, end: 99 } });
		expect(parseRange('bytes=50-500', 100)).toEqual({
			kind: 'range',
			range: { start: 50, end: 99 }
		});
		expect(parseRange('bytes=-10', 100)).toEqual({ kind: 'range', range: { start: 90, end: 99 } });
		expect(parseRange('bytes=-500', 100)).toEqual({ kind: 'range', range: { start: 0, end: 99 } });
	});

	it('marks ranges beyond the end as unsatisfiable', () => {
		expect(parseRange('bytes=100-', 100)).toEqual({ kind: 'unsatisfiable' });
		expect(parseRange('bytes=-0', 100)).toEqual({ kind: 'unsatisfiable' });
	});

	it('never serves ranges of empty files', () => {
		expect(parseRange('bytes=0-0', 0)).toEqual({ kind: 'none' });
	});
});

describe('mediaFileResponse', () => {
	const content = Uint8Array.from({ length: 256 }, (_, index) => index);
	const path = 'media/2026/09/clip.webm';
	let root: string;
	let storage: FsStorage;
	let etag: string;

	beforeAll(async () => {
		root = await mkdtemp(join(tmpdir(), 'cms-media-'));
		await mkdir(join(root, 'media/2026/09'), { recursive: true });
		await writeFile(join(root, path), content);
		storage = new FsStorage(root);
		etag = (await mediaFileResponse(storage, path, new Request('http://cms.test/')))!.headers.get(
			'etag'
		)!;
	});
	afterAll(() => rm(root, { recursive: true, force: true }));

	const get = (headers: Record<string, string> = {}, adapter: StorageAdapter = storage) =>
		mediaFileResponse(adapter, path, new Request('http://cms.test/', { headers }));

	it('streams the whole file and announces range support', async () => {
		const response = (await get())!;
		expect(response.status).toBe(200);
		expect(response.headers.get('accept-ranges')).toBe('bytes');
		expect(response.headers.get('content-length')).toBe('256');
		expect(response.headers.get('content-type')).toBe('video/webm');
		expect(new Uint8Array(await response.arrayBuffer())).toEqual(content);
	});

	it('answers a byte range with 206 and exactly those bytes', async () => {
		const response = (await get({ range: 'bytes=10-19' }))!;
		expect(response.status).toBe(206);
		expect(response.headers.get('content-range')).toBe('bytes 10-19/256');
		expect(response.headers.get('content-length')).toBe('10');
		expect(new Uint8Array(await response.arrayBuffer())).toEqual(content.slice(10, 20));
	});

	it('answers unsatisfiable ranges with 416 and the file size', async () => {
		const response = (await get({ range: 'bytes=300-' }))!;
		expect(response.status).toBe(416);
		expect(response.headers.get('content-range')).toBe('bytes */256');
	});

	it('sends the whole file when If-Range no longer matches', async () => {
		const response = (await get({ range: 'bytes=0-9', 'if-range': '"stale"' }))!;
		expect(response.status).toBe(200);
		const matching = (await get({ range: 'bytes=0-9', 'if-range': etag }))!;
		expect(matching.status).toBe(206);
	});

	it('keeps 304 for a matching ETag', async () => {
		expect((await get({ 'if-none-match': etag }))!.status).toBe(304);
	});

	it('falls back to readBytes for adapters without readStream', async () => {
		const withoutStream: StorageAdapter = {
			read: (file) => storage.read(file),
			readBytes: (file) => storage.readBytes(file),
			write: (file, data) => storage.write(file, data),
			exists: (file) => storage.exists(file),
			remove: (file) => storage.remove(file),
			list: (prefix) => storage.list(prefix),
			stat: (file) => storage.stat(file)
		};
		const response = (await get({ range: 'bytes=-6' }, withoutStream))!;
		expect(response.status).toBe(206);
		expect(new Uint8Array(await response.arrayBuffer())).toEqual(content.slice(250));
	});

	it('returns null for missing files', async () => {
		expect(
			await mediaFileResponse(storage, 'media/missing.mp4', new Request('http://cms.test/'))
		).toBeNull();
	});
});
