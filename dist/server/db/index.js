import { serverConfig } from '../runtime';
import { createSqliteDriver } from './sqlite';
let driver = null;
let pending = null;
/** Database singleton, selected via DATABASE_URL (`sqlite:<file>` | `postgres://…`). */
export async function getDb() {
    if (driver)
        return driver;
    if (!pending) {
        pending = (async () => {
            const url = serverConfig().databaseUrl;
            if (url.startsWith('postgres://') || url.startsWith('postgresql://')) {
                const { createPostgresDriver } = await import('./postgres');
                driver = createPostgresDriver(url);
            }
            else if (url.startsWith('sqlite:')) {
                driver = createSqliteDriver(url.slice('sqlite:'.length) || 'cms.db', serverConfig().dataDir);
            }
            else {
                throw new Error(`DATABASE_URL nicht unterstützt: ${url}`);
            }
            return driver;
        })();
    }
    return pending;
}
