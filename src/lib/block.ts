import type { FieldMap } from './fields';
import { isValidName } from './name';
import type { InferFields } from './types';

export type Migration = (data: Record<string, unknown>) => Record<string, unknown>;

export interface BlockDefinition<Fields extends FieldMap = FieldMap> {
	/** Must match the folder name under `src/blocks/`. */
	name: string;
	label: string;
	description?: string;
	/** Lucide icon name for the admin. */
	icon?: string;
	/** Schema version; bump on incompatible `fields` changes and provide `migrate[oldVersion]`. */
	version: number;
	fields: Fields;
	/** Migrations from version n to n+1, keyed by the source version, applied to the merged data of ONE language. */
	migrate?: Record<number, Migration>;
}

export interface BlockOptions<Fields extends FieldMap> {
	name: string;
	label?: string;
	description?: string;
	icon?: string;
	version?: number;
	fields: Fields;
	migrate?: Record<number, Migration>;
}

export function defineBlock<const Fields extends FieldMap>(
	options: BlockOptions<Fields>
): BlockDefinition<Fields> {
	if (!isValidName(options.name)) {
		throw new Error(`Block-Name „${options.name}" ist ungültig (nur a-z, 0-9, -).`);
	}
	return {
		name: options.name,
		label: options.label ?? options.name,
		description: options.description,
		icon: options.icon,
		version: options.version ?? 1,
		fields: options.fields,
		migrate: options.migrate
	};
}

/** Props of a block component: `let { title, image }: BlockProps<typeof definition> = $props();` */
export type BlockProps<Definition> =
	Definition extends BlockDefinition<infer Fields> ? InferFields<Fields> : never;

/** Migrates block data up to the current version (idempotent). */
export function migrateBlockData(
	definition: BlockDefinition,
	version: number,
	data: Record<string, unknown>
): { version: number; data: Record<string, unknown> } {
	let current = data;
	let currentVersion = version;
	while (currentVersion < definition.version) {
		const step = definition.migrate?.[currentVersion];
		// Missing migration: data and version stay as they are; validation reports it.
		if (!step) break;
		current = step(current);
		currentVersion += 1;
	}
	return { version: currentVersion, data: current };
}
