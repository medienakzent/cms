import type { DbDriver } from './driver';
export type { DbDriver, Dialect } from './driver';
/** Database singleton, selected via DATABASE_URL (`sqlite:<file>` | `postgres://…`). */
export declare function getDb(): Promise<DbDriver>;
