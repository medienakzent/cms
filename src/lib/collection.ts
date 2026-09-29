import type { FieldMap, TextField } from './fields';
import type { Migration } from './block';
import type { Document } from './types';

export interface CollectionDefinition<F extends FieldMap = FieldMap> {
	/** Muss dem Dateinamen unter `src/collections/` entsprechen (`pages.ts` → `pages`). */
	name: string;
	label: string;
	labelPlural: string;
	description?: string;
	icon?: string;
	version: number;
	fields: F;
	/** Erlaubte Block-Typen; `false` = Collection ohne Block-Bereich (z. B. Tags). */
	blocks: readonly string[] | false;
	/** Textfeld, das im Admin als Titel dient und den Slug-Vorschlag liefert. */
	titleField: keyof F & string;
	/** Optionales Feld für Kurzbeschreibung in Listen/Index. */
	excerptField?: keyof F & string;
	/** Feld für die Sortierung im Index (`updatedAt` = Zeitstempel). */
	sortBy: { field: string; direction: 'asc' | 'desc' };
	/** Öffentlicher Pfad eines Dokuments; `null` = nicht direkt aufrufbar. */
	path: (slug: string, lang: string) => string | null;
	migrate?: Record<number, Migration>;
}

export interface CollectionOptions<F extends FieldMap> {
	name: string;
	label?: string;
	labelPlural?: string;
	description?: string;
	icon?: string;
	version?: number;
	fields: F;
	blocks?: readonly string[] | false;
	titleField?: keyof F & string;
	excerptField?: keyof F & string;
	sortBy?: { field: string; direction: 'asc' | 'desc' };
	path?: (slug: string, lang: string) => string | null;
	migrate?: Record<number, Migration>;
}

export function defineCollection<const F extends FieldMap>(
	def: CollectionOptions<F>
): CollectionDefinition<F> {
	if (!/^[a-z][a-z0-9-]*$/.test(def.name)) {
		throw new Error(`Collection-Name „${def.name}" ist ungültig (nur a-z, 0-9, -).`);
	}
	const titleField = (def.titleField ?? 'title') as keyof F & string;
	const tf = def.fields[titleField] as TextField | undefined;
	if (!tf || tf.kind !== 'text') {
		throw new Error(
			`Collection „${def.name}": titleField „${titleField}" fehlt oder ist kein Textfeld.`
		);
	}
	return {
		name: def.name,
		label: def.label ?? def.name,
		labelPlural: def.labelPlural ?? def.label ?? def.name,
		description: def.description,
		icon: def.icon,
		version: def.version ?? 1,
		fields: def.fields,
		blocks: def.blocks ?? false,
		titleField,
		excerptField: def.excerptField,
		sortBy: def.sortBy ?? { field: 'updatedAt', direction: 'desc' },
		path: def.path ?? (() => null),
		migrate: def.migrate
	};
}

/** Dokumenttyp einer Collection: `DocumentOf<typeof pages>`. */
export type DocumentOf<C> = C extends CollectionDefinition<infer F> ? Document<F> : never;

/**
 * Globale Inhaltsdatei `src/cms.content.ts`: bündelt zusätzliche Collections an
 * einer Stelle — Alternative oder Ergänzung zu einzelnen Dateien in src/collections/.
 *
 *   export default defineContent({ collections: [defineCollection({...}), ...] });
 */
export interface ContentDefinition {
	collections: CollectionDefinition[];
}
export function defineContent(def: { collections?: CollectionDefinition[] }): ContentDefinition {
	return { collections: def.collections ?? [] };
}
