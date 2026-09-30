/**
 * Minimal database driver: the index only needs SELECT/INSERT/UPSERT/DELETE.
 * SQL uses `?` placeholders; the Postgres driver translates them to `$n`.
 * Portable SQL convention: TEXT and INTEGER only, timestamps as ISO text,
 * booleans as 0/1, IDs as TEXT (no autoincrement).
 */
export type Dialect = 'sqlite' | 'postgres';
export interface DbDriver {
    dialect: Dialect;
    all<Row = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<Row[]>;
    get<Row = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<Row | null>;
    run(sql: string, params?: unknown[]): Promise<void>;
    /** Multiple statements (schema). */
    exec(sql: string): Promise<void>;
    transaction<Result>(callback: () => Promise<Result>): Promise<Result>;
    /** Raw handle for Better Auth (better-sqlite3 Database or pg Pool). */
    raw: unknown;
}
export declare function toPgPlaceholders(sql: string): string;
