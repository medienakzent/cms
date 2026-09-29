import type { FieldMap, TextField } from './fields';
import { isValidName } from './name';
import type { Migration } from './block';
import type { Document } from './types';

export interface CollectionDefinition<Fields extends FieldMap = FieldMap> {
	/** Must match the file name under `src/collections/` (`pages.ts` -> `pages`). */
	name: string;
	label: string;
	labelPlural: string;
	description?: string;
	icon?: string;
	version: number;
	fields: Fields;
	/** Allowed block types; `false` = collection without a block area (tags, for example). */
	blocks: readonly string[] | false;
	/** Text field used as the admin title and the slug suggestion. */
	titleField: keyof Fields & string;
	/** Optional field for the short description in lists and the index. */
	excerptField?: keyof Fields & string;
	/** Index sort order (`updatedAt` = timestamp). */
	sortBy: { field: string; direction: 'asc' | 'desc' };
	/** Public path of a document; `null` = not directly reachable. */
	path: (slug: string, lang: string) => string | null;
	migrate?: Record<number, Migration>;
}

export interface CollectionOptions<Fields extends FieldMap> {
	name: string;
	label?: string;
	labelPlural?: string;
	description?: string;
	icon?: string;
	version?: number;
	fields: Fields;
	blocks?: readonly string[] | false;
	titleField?: keyof Fields & string;
	excerptField?: keyof Fields & string;
	sortBy?: { field: string; direction: 'asc' | 'desc' };
	path?: (slug: string, lang: string) => string | null;
	migrate?: Record<number, Migration>;
}

export function defineCollection<const Fields extends FieldMap>(
	options: CollectionOptions<Fields>
): CollectionDefinition<Fields> {
	if (!isValidName(options.name)) {
		throw new Error(`Collection-Name „${options.name}" ist ungültig (nur a-z, 0-9, -).`);
	}
	const titleField = (options.titleField ?? 'title') as keyof Fields & string;
	const titleFieldDefinition = options.fields[titleField] as TextField | undefined;
	if (!titleFieldDefinition || titleFieldDefinition.kind !== 'text') {
		throw new Error(
			`Collection „${options.name}": titleField „${titleField}" fehlt oder ist kein Textfeld.`
		);
	}
	return {
		name: options.name,
		label: options.label ?? options.name,
		labelPlural: options.labelPlural ?? options.label ?? options.name,
		description: options.description,
		icon: options.icon,
		version: options.version ?? 1,
		fields: options.fields,
		blocks: options.blocks ?? false,
		titleField,
		excerptField: options.excerptField,
		sortBy: options.sortBy ?? { field: 'updatedAt', direction: 'desc' },
		path: options.path ?? (() => null),
		migrate: options.migrate
	};
}

/** Document type of a collection: `DocumentOf<typeof pages>`. */
export type DocumentOf<Collection> =
	Collection extends CollectionDefinition<infer Fields> ? Document<Fields> : never;

/**
 * Global content file `src/cms.content.ts`: bundles additional collections in one place,
 * as an alternative or addition to single files in src/collections/.
 *
 *   export default defineContent({ collections: [defineCollection({...}), ...] });
 */
export interface ContentDefinition {
	collections: CollectionDefinition[];
}
export function defineContent(options: {
	collections?: CollectionDefinition[];
}): ContentDefinition {
	return { collections: options.collections ?? [] };
}
