import type { ByteRange, StorageAdapter } from './storage';
export type RangeRequest = {
    kind: 'none';
} | {
    kind: 'range';
    range: ByteRange;
} | {
    kind: 'unsatisfiable';
};
/**
 * Evaluates a `Range` header against a file size (RFC 9110, section 14). Only single byte ranges
 * are served partially; multiple ranges, other units and malformed headers are ignored, which
 * the RFC allows — the client then receives the whole file.
 */
export declare function parseRange(header: string | null, size: number): RangeRequest;
/**
 * Response for a media file from the storage: ETag/304, byte ranges (206/416) for video and audio,
 * streamed bodies. `path` must already be validated by the caller.
 */
export declare function mediaFileResponse(storage: StorageAdapter, path: string, request: Request): Promise<Response | null>;
