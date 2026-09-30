import { AsyncLocalStorage } from 'node:async_hooks';
import pg from 'pg';
import { toPgPlaceholders } from './driver';
/** PostgreSQL driver with the same SQL conventions as SQLite (see driver.ts). */
export function createPostgresDriver(connectionString) {
    const pool = new pg.Pool({ connectionString });
    // Each transaction owns one client; queries inside it are routed through AsyncLocalStorage.
    const transactionClient = new AsyncLocalStorage();
    const query = (sql, params) => (transactionClient.getStore() ?? pool).query(toPgPlaceholders(sql), params);
    return {
        dialect: 'postgres',
        raw: pool,
        async all(sql, params = []) {
            return (await query(sql, params)).rows;
        },
        async get(sql, params = []) {
            return (await query(sql, params)).rows[0] ?? null;
        },
        async run(sql, params = []) {
            await query(sql, params);
        },
        async exec(sql) {
            await (transactionClient.getStore() ?? pool).query(sql);
        },
        async transaction(callback) {
            if (transactionClient.getStore())
                return callback();
            const client = await pool.connect();
            try {
                await client.query('BEGIN');
                const result = await transactionClient.run(client, callback);
                await client.query('COMMIT');
                return result;
            }
            catch (error) {
                await client.query('ROLLBACK');
                throw error;
            }
            finally {
                client.release();
            }
        }
    };
}
