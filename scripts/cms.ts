#!/usr/bin/env tsx
/**
 * CLI für Skripte/CI — spricht die REST-API des laufenden Servers an, damit
 * es exakt denselben Codepfad wie Admin und Bibliothek nutzt.
 *
 *   CMS_URL=http://localhost:5173 API_TOKEN=… npm run cms -- <befehl>
 *
 *   list <collection> [--lang de] [--status all]
 *   get <collection> <slug> [--lang de] [--editable]
 *   put <collection> <slug> <datei.json> [--lang de] [--status published]
 *   create <collection> <slug> <datei.json> [--lang de]
 *   delete <collection> <slug> [--lang de]
 *   versions <collection> <slug>
 *   upload <datei> [...]
 *   reindex
 *   schema
 */
import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';

const BASE = (process.env.CMS_URL ?? 'http://localhost:5173').replace(/\/+$/, '');
const TOKEN = process.env.API_TOKEN ?? '';

const [cmd, ...rest] = process.argv.slice(2);
const args = rest.filter((a) => !a.startsWith('--'));
const flags: Record<string, string> = {};
for (let i = 0; i < rest.length; i++) {
	if (rest[i].startsWith('--')) flags[rest[i].slice(2)] = rest[i + 1] && !rest[i + 1].startsWith('--') ? rest[++i] : '1';
}

async function call(path: string, init: RequestInit = {}) {
	const headers = new Headers(init.headers);
	if (TOKEN) headers.set('authorization', `Bearer ${TOKEN}`);
	const res = await fetch(`${BASE}/api/v1${path}`, { ...init, headers });
	const text = await res.text();
	let data: unknown = text;
	try {
		data = JSON.parse(text);
	} catch {
		/* Text */
	}
	if (!res.ok) {
		console.error(`HTTP ${res.status}`, JSON.stringify(data, null, 2));
		process.exit(1);
	}
	return data;
}

const json = (body: unknown, method = 'POST') => ({
	method,
	headers: { 'content-type': 'application/json' },
	body: JSON.stringify(body)
});
const q = (o: Record<string, string | undefined>) => {
	const p = new URLSearchParams();
	for (const [k, v] of Object.entries(o)) if (v) p.set(k, v);
	const s = p.toString();
	return s ? `?${s}` : '';
};
const print = (d: unknown) => console.log(JSON.stringify(d, null, 2));

switch (cmd) {
	case 'list':
		print(await call(`/${args[0]}${q({ lang: flags.lang, status: flags.status ?? 'all', q: flags.q, limit: flags.limit })}`));
		break;
	case 'get':
		print(await call(`/${args[0]}/${args[1]}${q({ lang: flags.lang, editable: flags.editable, status: 'all', fallback: flags.fallback })}`));
		break;
	case 'put': {
		const body = JSON.parse(await readFile(args[2], 'utf8'));
		if (flags.status) body.status = flags.status;
		print(await call(`/${args[0]}/${args[1]}${q({ lang: flags.lang })}`, json(body, 'PUT')));
		break;
	}
	case 'create': {
		const body = JSON.parse(await readFile(args[2], 'utf8'));
		print(await call(`/${args[0]}`, json({ ...body, slug: args[1], lang: flags.lang, status: flags.status })));
		break;
	}
	case 'delete':
		print(await call(`/${args[0]}/${args[1]}${q({ lang: flags.lang })}`, { method: 'DELETE' }));
		break;
	case 'versions':
		print(await call(`/${args[0]}/${args[1]}/versions`));
		break;
	case 'upload': {
		const form = new FormData();
		for (const file of args) form.append('file', new Blob([await readFile(file)]), basename(file));
		print(await call('/media', { method: 'POST', body: form }));
		break;
	}
	case 'reindex':
		print(await call('/reindex', { method: 'POST' }));
		break;
	case 'schema':
		print(await call('/collections'));
		break;
	default:
		console.error('Unbekannter Befehl. Siehe Kopf von scripts/cms.ts');
		process.exit(1);
}
