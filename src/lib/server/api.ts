import { json, type RequestEvent } from '@sveltejs/kit';
import type { DocumentStatus, RenderBlock } from '../types';
import type { Actor } from './content';
import { CmsError } from './errors';
import { QueryError } from '../query';

/** Uniform error response for REST routes. */
export async function api<Result>(handler: () => Promise<Result>): Promise<Response> {
	try {
		const result = await handler();
		return json(result ?? { ok: true });
	} catch (error) {
		if (error instanceof QueryError)
			return json({ error: error.message, issues: error.issues }, { status: 400 });
		if (error instanceof CmsError) {
			return json({ error: error.message, issues: error.issues }, { status: error.status });
		}
		if (error instanceof SyntaxError) return json({ error: 'Ungültiges JSON' }, { status: 400 });
		console.error(error);
		return json({ error: 'Interner Fehler' }, { status: 500 });
	}
}

/**
 * Enforce a byte limit while the body is read. Content-Length alone is not
 * reliable (chunked uploads carry none).
 */
export function limitRequestBody(request: Request, maxBytes: number): Request {
	if (!request.body) return request;
	// Reading manually instead of piping: cancelling the upstream stream would destroy
	// the socket before the 413 response is written.
	const reader = request.body.getReader();
	let seen = 0;
	const limited = new ReadableStream<Uint8Array>({
		async pull(controller) {
			const { done, value } = await reader.read();
			if (done) {
				controller.close();
				return;
			}
			seen += value.byteLength;
			if (seen > maxBytes) {
				reader.releaseLock();
				controller.error(new CmsError(413, 'Anfrage zu groß'));
				return;
			}
			controller.enqueue(value);
		},
		cancel(reason) {
			return reader.cancel(reason);
		}
	});
	return new Request(request, { body: limited, duplex: 'half' } as RequestInit);
}

export function actorOf(event: RequestEvent): Actor {
	const user = event.locals.user;
	return user ? { id: user.id, name: user.name } : { id: 'anonymous', name: 'anonymous' };
}

export function requireAdmin(event: RequestEvent): void {
	if (event.locals.user?.role !== 'admin') throw new CmsError(403, 'Nur für Administratoren');
}

/** User and API key management needs a real browser session of an administrator, never an API token. */
export function requireSessionAdmin(event: RequestEvent): void {
	if (event.locals.user?.role !== 'admin' || event.locals.user.api)
		throw new CmsError(403, 'Nur für angemeldete Administratoren');
}

export function jsonError(status: number, error: string, headers: Record<string, string> = {}) {
	return json({ error }, { status, headers });
}

/** Strict JSON body: content type checked, objects only, allowed keys only. */
export async function readJsonBody(
	event: RequestEvent,
	allowedKeys: readonly string[]
): Promise<Record<string, unknown>> {
	const contentType = event.request.headers.get('content-type') ?? '';
	if (!contentType.toLowerCase().startsWith('application/json'))
		throw new CmsError(415, 'Content-Type application/json erwartet');
	let body: unknown;
	try {
		body = await event.request.json();
	} catch {
		throw new CmsError(400, 'Ungültiges JSON');
	}
	if (typeof body !== 'object' || body === null || Array.isArray(body))
		throw new CmsError(400, 'JSON-Objekt erwartet');
	const unknownKeys = Object.keys(body).filter((key) => !allowedKeys.includes(key));
	if (unknownKeys.length) {
		throw new CmsError(
			400,
			'Unbekannte Felder im Body',
			unknownKeys.map((key) => ({
				path: key,
				message: `Unbekannt. Erlaubt: ${allowedKeys.join(', ')}`
			}))
		);
	}
	return body as Record<string, unknown>;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

/** Checks the shape of `fields`, `blocks` and `status` of a document body; content validation happens in the library. */
export function parseDocumentBody(body: Record<string, unknown>): {
	fields: Record<string, unknown>;
	blocks: RenderBlock[];
	status?: DocumentStatus;
} {
	const issues: { path: string; message: string }[] = [];
	if (body.fields !== undefined && !isRecord(body.fields))
		issues.push({ path: 'fields', message: 'Objekt erwartet' });
	if (body.blocks !== undefined) {
		if (!Array.isArray(body.blocks)) issues.push({ path: 'blocks', message: 'Array erwartet' });
		else
			body.blocks.forEach((block, index) => {
				if (!isRecord(block) || typeof block.type !== 'string')
					issues.push({ path: `blocks[${index}]`, message: '{ id?, type, data } erwartet' });
				else if (block.data !== undefined && !isRecord(block.data))
					issues.push({ path: `blocks[${index}].data`, message: 'Objekt erwartet' });
				else if (
					block.id !== undefined &&
					(typeof block.id !== 'string' || !/^[A-Za-z0-9_-]{1,32}$/.test(block.id))
				)
					issues.push({
						path: `blocks[${index}].id`,
						message: 'ID: 1–32 Zeichen [A-Za-z0-9_-]'
					});
			});
	}
	if (body.status !== undefined && body.status !== 'draft' && body.status !== 'published')
		issues.push({ path: 'status', message: 'draft oder published' });
	if (issues.length) throw new CmsError(400, 'Ungültiger Body', issues);
	return {
		fields: (body.fields as Record<string, unknown>) ?? {},
		blocks: ((body.blocks as RenderBlock[]) ?? []).map((block) => ({
			id: block.id ?? '',
			type: block.type,
			data: block.data ?? {}
		})),
		status: body.status as DocumentStatus | undefined
	};
}
