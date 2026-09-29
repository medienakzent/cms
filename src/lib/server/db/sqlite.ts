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
		async all<Row>(sql: string, params: unknown[] = []) {
			return db.prepare(sql).all(...params) as Row[];
		},
		async get<Row>(sql: string, params: unknown[] = []) {
			return (db.prepare(sql).get(...params) as Row | undefined) ?? null;
		},
		async run(sql: string, params: unknown[] = []) {
			db.prepare(sql).run(...params);
		},
		async exec(sql: string) {
			db.exec(sql);
		},
		async transaction<Result>(callback: () => Promise<Result>) {
			// better-sqlite3 is synchronous; an async callback cannot run inside db.transaction.
			db.exec('BEGIN');
			try {
				const result = await callback();
				db.exec('COMMIT');
				return result;
			} catch (error) {
				db.exec('ROLLBACK');
				throw error;
			}
		}
	};
}
