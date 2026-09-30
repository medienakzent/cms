import { type RequestEvent } from '@sveltejs/kit';
import type { DocumentStatus, RenderBlock } from '../types';
import type { Actor } from './content';
/** Uniform error response for REST routes. */
export declare function api<Result>(handler: () => Promise<Result>): Promise<Response>;
/**
 * Enforce a byte limit while the body is read. Content-Length alone is not
 * reliable (chunked uploads carry none).
 */
export declare function limitRequestBody(request: Request, maxBytes: number): Request;
export declare function actorOf(event: RequestEvent): Actor;
export declare function requireAdmin(event: RequestEvent): void;
/** User and API key management needs a real browser session of an administrator, never an API token. */
export declare function requireSessionAdmin(event: RequestEvent): void;
export declare function jsonError(status: number, error: string, headers?: Record<string, string>): Response;
/** Strict JSON body: content type checked, objects only, allowed keys only. */
export declare function readJsonBody(event: RequestEvent, allowedKeys: readonly string[]): Promise<Record<string, unknown>>;
/** Checks the shape of `fields`, `blocks` and `status` of a document body; content validation happens in the library. */
export declare function parseDocumentBody(body: Record<string, unknown>): {
    fields: Record<string, unknown>;
    blocks: RenderBlock[];
    status?: DocumentStatus;
};
