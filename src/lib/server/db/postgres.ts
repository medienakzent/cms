import pg from 'pg';
import { toPgPlaceholders, type DbDriver } from './driver';

/**
 * PostgreSQL-Treiber. Gleiche SQL-Konventionen wie SQLite (siehe driver.ts).
 * Transaktionen: eine Verbindung pro Transaktion über AsyncLocalStorage wäre
 * sauberer; für den Index reicht BEGIN/COMMIT auf einem dedizierten Client.
 */
export function createPostgresDriver(connectionString: string): DbDriver {
	const pool = new pg.Pool({ connectionString });
	let txClient: pg.PoolClient | null = null;

	const q = () => (txClient ?? pool) as { query: pg.Pool['query'] };

	return {
		dialect: 'postgres',
		raw: pool,
		async all<T>(sql: string, params: unknown[] = []) {
			const res = await q().query(toPgPlaceholders(sql), params);
			return res.rows as T[];
		},
		async get<T>(sql: string, params: unknown[] = []) {
			const res = await q().query(toPgPlaceholders(sql), params);
			return (res.rows[0] as T | undefined) ?? null;
		},
		async run(sql: string, params: unknown[] = []) {
			await q().query(toPgPlaceholders(sql), params);
		},
		async exec(sql: string) {
			await pool.query(sql);
		},
		async transaction<T>(fn: () => Promise<T>) {
			if (txClient) return fn();
			const client = await pool.connect();
			txClient = client;
			try {
				await client.query('BEGIN');
				const result = await fn();
				await client.query('COMMIT');
				return result;
			} catch (e) {
				await client.query('ROLLBACK');
				throw e;
			} finally {
				txClient = null;
				client.release();
			}
		}
	};
}
