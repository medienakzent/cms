import { serverConfig } from '../runtime';
import type { DbDriver } from './driver';
import { createSqliteDriver } from './sqlite';

export type { DbDriver, Dialect } from './driver';

let driver: DbDriver | null = null;
let pending: Promise<DbDriver> | null = null;

/** Datenbank-Singleton, ausgewählt über DATABASE_URL (`sqlite:<datei>` | `postgres://…`). */
export async function getDb(): Promise<DbDriver> {
	if (driver) return driver;
	if (!pending) {
		pending = (async () => {
			const url = serverConfig().databaseUrl;
			if (url.startsWith('postgres://') || url.startsWith('postgresql://')) {
				const { createPostgresDriver } = await import('./postgres');
				driver = createPostgresDriver(url);
			} else if (url.startsWith('sqlite:')) {
				driver = createSqliteDriver(
					url.slice('sqlite:'.length) || 'cms.db',
					serverConfig().dataDir
				);
			} else {
				throw new Error(`DATABASE_URL nicht unterstützt: ${url}`);
			}
			return driver;
		})();
	}
	return pending;
}
