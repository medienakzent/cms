import { AsyncLocalStorage } from 'node:async_hooks';
import pg from 'pg';
import { toPgPlaceholders, type DbDriver } from './driver';

/** PostgreSQL driver with the same SQL conventions as SQLite (see driver.ts). */
export function createPostgresDriver(connectionString: string): DbDriver {
	const pool = new pg.Pool({ connectionString });
	// Each transaction owns one client; queries inside it are routed through AsyncLocalStorage.
	const transactionClient = new AsyncLocalStorage<pg.PoolClient>();

	const query = (sql: string, params: unknown[]) =>
		(transactionClient.getStore() ?? pool).query(toPgPlaceholders(sql), params);

	return {
		dialect: 'postgres',
		raw: pool,
		async all<Row>(sql: string, params: unknown[] = []) {
			return (await query(sql, params)).rows as Row[];
		},
		async get<Row>(sql: string, params: unknown[] = []) {
			return ((await query(sql, params)).rows[0] as Row | undefined) ?? null;
		},
		async run(sql: string, params: unknown[] = []) {
			await query(sql, params);
		},
		async exec(sql: string) {
			await (transactionClient.getStore() ?? pool).query(sql);
		},
		async transaction<Result>(callback: () => Promise<Result>) {
			if (transactionClient.getStore()) return callback();
			const client = await pool.connect();
			try {
				await client.query('BEGIN');
				const result = await transactionClient.run(client, callback);
				await client.query('COMMIT');
				return result;
			} catch (error) {
				await client.query('ROLLBACK');
				throw error;
			} finally {
				client.release();
			}
		}
	};
}
