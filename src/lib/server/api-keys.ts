/**
 * API keys with a role (admin | editor), managed in the admin. Only the SHA-256 hash is
 * stored; the plaintext is shown exactly once on creation. Format: `cms_<prefix>_<secret>`,
 * the prefix identifies the key in lists. The table is auth data (not reconstructible),
 * so /data must be backed up.
 */
import { createHash, randomBytes } from 'node:crypto';
import { getDb } from './db';
import type { Role } from './auth';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS cms_api_keys (
	id TEXT PRIMARY KEY,
	name TEXT NOT NULL,
	role TEXT NOT NULL,
	prefix TEXT NOT NULL,
	key_hash TEXT NOT NULL UNIQUE,
	created_at TEXT NOT NULL,
	created_by TEXT NOT NULL DEFAULT '',
	last_used_at TEXT,
	revoked_at TEXT
);`;

export interface ApiKeyInfo {
	id: string;
	name: string;
	role: Role;
	/** Visible start of the key, e.g. `cms_a1b2c3d4` */
	prefix: string;
	createdAt: string;
	createdBy: string;
	lastUsedAt: string | null;
	revokedAt: string | null;
}

interface Row {
	id: string;
	name: string;
	role: string;
	prefix: string;
	created_at: string;
	created_by: string;
	last_used_at: string | null;
	revoked_at: string | null;
}

const hash = (key: string) => createHash('sha256').update(key).digest('hex');
const toInfo = (row: Row): ApiKeyInfo => ({
	id: row.id,
	name: row.name,
	role: row.role === 'admin' ? 'admin' : 'editor',
	prefix: row.prefix,
	createdAt: row.created_at,
	createdBy: row.created_by,
	lastUsedAt: row.last_used_at,
	revokedAt: row.revoked_at
});

const lastUsedWritten = new Map<string, number>();

export const apiKeys = {
	async ensureSchema() {
		await (await getDb()).exec(SCHEMA);
	},

	async list(): Promise<ApiKeyInfo[]> {
		const rows = await (
			await getDb()
		).all<Row>('SELECT * FROM cms_api_keys ORDER BY created_at DESC');
		return rows.map(toInfo);
	},

	/** Creates a key and returns the plaintext, this one time only. */
	async create(
		name: string,
		role: Role,
		createdBy: string
	): Promise<{ info: ApiKeyInfo; key: string }> {
		const id = randomBytes(8).toString('hex');
		const prefix = `cms_${randomBytes(4).toString('hex')}`;
		const key = `${prefix}_${randomBytes(24).toString('base64url')}`;
		const createdAt = new Date().toISOString();
		await (
			await getDb()
		).run(
			'INSERT INTO cms_api_keys (id, name, role, prefix, key_hash, created_at, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
			[id, name, role, prefix, hash(key), createdAt, createdBy]
		);
		return {
			info: { id, name, role, prefix, createdAt, createdBy, lastUsedAt: null, revokedAt: null },
			key
		};
	},

	async revoke(id: string): Promise<boolean> {
		const db = await getDb();
		const row = await db.get<Row>('SELECT * FROM cms_api_keys WHERE id = ?', [id]);
		if (!row) return false;
		await db.run('UPDATE cms_api_keys SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL', [
			new Date().toISOString(),
			id
		]);
		return true;
	},

	/** Verifies a bearer key; returns its info or null. Records last use, throttled to once a minute. */
	async verify(key: string): Promise<ApiKeyInfo | null> {
		if (!/^cms_[0-9a-f]{8}_[A-Za-z0-9_-]{20,}$/.test(key)) return null;
		const db = await getDb();
		const row = await db.get<Row>(
			'SELECT * FROM cms_api_keys WHERE key_hash = ? AND revoked_at IS NULL',
			[hash(key)]
		);
		if (!row) return null;
		const now = Date.now();
		if ((lastUsedWritten.get(row.id) ?? 0) < now - 60_000) {
			lastUsedWritten.set(row.id, now);
			db.run('UPDATE cms_api_keys SET last_used_at = ? WHERE id = ?', [
				new Date(now).toISOString(),
				row.id
			]).catch(() => undefined);
		}
		return toInfo(row);
	}
};
