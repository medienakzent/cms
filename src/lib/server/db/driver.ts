/**
 * Minimaler Datenbank-Treiber: Der Index braucht nur SELECT/INSERT/UPSERT/DELETE.
 * SQL wird mit `?`-Platzhaltern geschrieben; der Postgres-Treiber übersetzt nach `$n`.
 * Konvention für portable SQL: nur TEXT und INTEGER, Zeitstempel als ISO-Text,
 * Booleans als 0/1, IDs als TEXT (kein Autoincrement).
 */
export type Dialect = 'sqlite' | 'postgres';

export interface DbDriver {
	dialect: Dialect;
	all<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
	get<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T | null>;
	run(sql: string, params?: unknown[]): Promise<void>;
	/** Mehrere Anweisungen (Schema). */
	exec(sql: string): Promise<void>;
	transaction<T>(fn: () => Promise<T>): Promise<T>;
	/** Rohes Handle für Better Auth (better-sqlite3 Database bzw. pg Pool). */
	raw: unknown;
}

export function toPgPlaceholders(sql: string): string {
	let i = 0;
	return sql.replace(/\?/g, () => `$${++i}`);
}
