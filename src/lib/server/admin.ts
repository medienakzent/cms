import type { BlockDefinition } from '../block';
import type { CollectionDefinition } from '../collection';
import { getRuntime } from './runtime';
import type { AdminBlock, AdminCollection } from '../admin/types';

export function toAdminCollection(c: CollectionDefinition): AdminCollection {
	return {
		name: c.name,
		label: c.label,
		labelPlural: c.labelPlural,
		icon: c.icon,
		titleField: c.titleField,
		fields: c.fields,
		blocks: c.blocks ? [...c.blocks] : []
	};
}

export function toAdminBlock(b: BlockDefinition): AdminBlock {
	return {
		name: b.name,
		label: b.label,
		description: b.description,
		icon: b.icon,
		version: b.version,
		fields: b.fields
	};
}

export const adminCollections = (): AdminCollection[] =>
	Object.values(getRuntime().registry.collections).map(toAdminCollection);
export const adminBlocks = (): Record<string, AdminBlock> =>
	Object.fromEntries(
		Object.values(getRuntime().registry.blocks).map((b) => [b.name, toAdminBlock(b)])
	);
