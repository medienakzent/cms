import { json, type RequestEvent } from '@sveltejs/kit';
import type { DocumentStatus, RenderBlock } from '../types';
import type { Actor } from './content';
import { CmsError } from './errors';
import { QueryError } from '../query';

/** Einheitliche Fehlerantwort für REST-Routen. */
export async function api<T>(fn: () => Promise<T>): Promise<Response> {
	try {
		const result = await fn();
		return json(result ?? { ok: true });
	} catch (e) {
		if (e instanceof QueryError)
			return json({ error: e.message, issues: e.issues }, { status: 400 });
		if (e instanceof CmsError) {
			return json({ error: e.message, issues: e.issues }, { status: e.status });
		}
		if (e instanceof SyntaxError) return json({ error: 'Ungültiges JSON' }, { status: 400 });
		console.error(e);
		return json({ error: 'Interner Fehler' }, { status: 500 });
	}
}

export function actorOf(event: RequestEvent): Actor {
	const u = event.locals.user;
	return u ? { id: u.id, name: u.name } : { id: 'anonymous', name: 'anonymous' };
}

export function requireAdmin(event: RequestEvent): void {
	if (event.locals.user?.role !== 'admin') throw new CmsError(403, 'Nur für Administratoren');
}

/** JSON-Body strikt lesen: Content-Type prüfen, nur Objekte, nur erlaubte Schlüssel. */
export async function readJsonBody(
	event: RequestEvent,
	allowedKeys: readonly string[]
): Promise<Record<string, unknown>> {
	const ct = event.request.headers.get('content-type') ?? '';
	if (!ct.toLowerCase().startsWith('application/json'))
		throw new CmsError(415, 'Content-Type application/json erwartet');
	let body: unknown;
	try {
		body = await event.request.json();
	} catch {
		throw new CmsError(400, 'Ungültiges JSON');
	}
	if (typeof body !== 'object' || body === null || Array.isArray(body))
		throw new CmsError(400, 'JSON-Objekt erwartet');
	const unknown = Object.keys(body).filter((k) => !allowedKeys.includes(k));
	if (unknown.length) {
		throw new CmsError(
			400,
			'Unbekannte Felder im Body',
			unknown.map((k) => ({ path: k, message: `Unbekannt. Erlaubt: ${allowedKeys.join(', ')}` }))
		);
	}
	return body as Record<string, unknown>;
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
	typeof v === 'object' && v !== null && !Array.isArray(v);

/** Prüft `fields`, `blocks` und `status` eines Dokument-Bodys auf ihre Grundform (Inhalte prüft die Bibliothek). */
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
			body.blocks.forEach((b, i) => {
				if (!isRecord(b) || typeof b.type !== 'string')
					issues.push({ path: `blocks[${i}]`, message: '{ id?, type, data } erwartet' });
				else if (b.data !== undefined && !isRecord(b.data))
					issues.push({ path: `blocks[${i}].data`, message: 'Objekt erwartet' });
				else if (
					b.id !== undefined &&
					(typeof b.id !== 'string' || !/^[A-Za-z0-9_-]{1,32}$/.test(b.id))
				)
					issues.push({ path: `blocks[${i}].id`, message: 'ID: 1–32 Zeichen [A-Za-z0-9_-]' });
			});
	}
	if (body.status !== undefined && body.status !== 'draft' && body.status !== 'published')
		issues.push({ path: 'status', message: 'draft oder published' });
	if (issues.length) throw new CmsError(400, 'Ungültiger Body', issues);
	return {
		fields: (body.fields as Record<string, unknown>) ?? {},
		blocks: ((body.blocks as RenderBlock[]) ?? []).map((b) => ({
			id: b.id ?? '',
			type: b.type,
			data: b.data ?? {}
		})),
		status: body.status as DocumentStatus | undefined
	};
}
