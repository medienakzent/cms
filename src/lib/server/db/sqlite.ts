import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, isAbsolute, join } from 'node:path';
import type { DbDriver } from './driver';

export function createSqliteDriver(file: string, dataDir: string): DbDriver {
	const path = isAbsolute(file) ? file : join(dataDir, file);
	mkdirSync(dirname(path), { recursive: true });
	const db = new Database(path);
	db.pragma('journal_mode = WAL');
	db.pragma('foreign_keys = ON');
	db.pragma('busy_timeout = 5000');

	return {
		dialect: 'sqlite',
		raw: db,
		async all<T>(sql: string, params: unknown[] = []) {
			return db.prepare(sql).all(...params) as T[];
		},
		async get<T>(sql: string, params: unknown[] = []) {
			return (db.prepare(sql).get(...params) as T | undefined) ?? null;
		},
		async run(sql: string, params: unknown[] = []) {
			db.prepare(sql).run(...params);
		},
		async exec(sql: string) {
			db.exec(sql);
		},
		async transaction<T>(fn: () => Promise<T>) {
			// better-sqlite3 ist synchron; ein asynchrones fn kann nicht in db.transaction laufen.
			db.exec('BEGIN');
			try {
				const result = await fn();
				db.exec('COMMIT');
				return result;
			} catch (e) {
				db.exec('ROLLBACK');
				throw e;
			}
		}
	};
}
