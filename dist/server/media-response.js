import { MIME_BY_EXTENSION } from './mime';
/**
 * Evaluates a `Range` header against a file size (RFC 9110, section 14). Only single byte ranges
 * are served partially; multiple ranges, other units and malformed headers are ignored, which
 * the RFC allows — the client then receives the whole file.
 */
export function parseRange(header, size) {
    if (!header || size === 0)
        return { kind: 'none' };
    const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
    if (!match || (match[1] === '' && match[2] === ''))
        return { kind: 'none' };
    if (match[1] === '') {
        // Suffix range: the last n bytes
        const length = Number(match[2]);
        if (length === 0)
            return { kind: 'unsatisfiable' };
        return { kind: 'range', range: { start: Math.max(0, size - length), end: size - 1 } };
    }
    const start = Number(match[1]);
    const end = match[2] === '' ? size - 1 : Number(match[2]);
    // A reversed range is invalid (ignored); only then does a start past the end count as unsatisfiable.
    if (match[2] !== '' && end < start)
        return { kind: 'none' };
    if (start >= size)
        return { kind: 'unsatisfiable' };
    return { kind: 'range', range: { start, end: Math.min(end, size - 1) } };
}
async function readRange(storage, path, range) {
    if (storage.readStream)
        return storage.readStream(path, range);
    const bytes = await storage.readBytes(path);
    return bytes ? new Uint8Array(bytes.subarray(range.start, range.end + 1)) : null;
}
/**
 * Response for a media file from the storage: ETag/304, byte ranges (206/416) for video and audio,
 * streamed bodies. `path` must already be validated by the caller.
 */
export async function mediaFileResponse(storage, path, request) {
    const fileStat = await storage.stat(path);
    if (!fileStat)
        return null;
    const etag = `"${fileStat.size}-${Date.parse(fileStat.mtime)}"`;
    const extension = path.split('.').pop()?.toLowerCase() ?? '';
    const headers = new Headers({
        'content-type': MIME_BY_EXTENSION[extension] ?? 'application/octet-stream',
        'accept-ranges': 'bytes',
        'cache-control': 'public, max-age=31536000, immutable',
        'x-content-type-options': 'nosniff',
        // No scripts from media (e.g. SVG); still usable as <img>.
        'content-security-policy': "sandbox; default-src 'none'; style-src 'unsafe-inline'",
        etag
    });
    if (request.headers.get('if-none-match') === etag)
        return new Response(null, { status: 304, headers });
    // If-Range: only answer partially while the client still holds the same version.
    const ifRange = request.headers.get('if-range');
    const rangeHeader = ifRange && ifRange !== etag ? null : request.headers.get('range');
    const rangeRequest = parseRange(rangeHeader, fileStat.size);
    if (rangeRequest.kind === 'unsatisfiable') {
        headers.set('content-range', `bytes */${fileStat.size}`);
        return new Response(null, { status: 416, headers });
    }
    if (rangeRequest.kind === 'range') {
        const { start, end } = rangeRequest.range;
        const body = await readRange(storage, path, rangeRequest.range);
        if (!body)
            return null;
        headers.set('content-range', `bytes ${start}-${end}/${fileStat.size}`);
        headers.set('content-length', String(end - start + 1));
        return new Response(body, { status: 206, headers });
    }
    const body = storage.readStream
        ? await storage.readStream(path)
        : await storage.readBytes(path).then((bytes) => (bytes ? new Uint8Array(bytes) : null));
    if (!body)
        return null;
    headers.set('content-length', String(fileStat.size));
    return new Response(body, { status: 200, headers });
}
