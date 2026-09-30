import { type DbDriver } from './driver';
/** PostgreSQL driver with the same SQL conventions as SQLite (see driver.ts). */
export declare function createPostgresDriver(connectionString: string): DbDriver;
