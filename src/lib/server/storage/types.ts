/**
 * Storage-Adapter: Inhalte, Historie und Medien liegen als Dateien hier —
 * NICHT in der Datenbank. Die Datenbank ist nur ein abgeleiteter Index.
 * Default: Dateisystem (fs.ts). Weitere Adapter (S3, …) implementieren dieses Interface.
 */
export interface StorageAdapter {
	read(path: string): Promise<string | null>;
	readBytes(path: string): Promise<Buffer | null>;
	/** Atomar: erst temporär schreiben, dann umbenennen. Legt Verzeichnisse an. */
	write(path: string, data: string | Buffer): Promise<void>;
	exists(path: string): Promise<boolean>;
	remove(path: string): Promise<void>;
	/** Alle Dateien (relative Pfade) unter `prefix`, rekursiv, sortiert. */
	list(prefix: string): Promise<string[]>;
	stat(path: string): Promise<{ size: number; mtime: string } | null>;
	/** Verzeichnis samt Inhalt entfernen (optional; sonst bleiben leere Ordner stehen). */
	removeDir?(prefix: string): Promise<void>;
}
