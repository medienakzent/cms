import type { BlockDefinition } from '../block';
import type { CollectionDefinition } from '../collection';
import { getRuntime } from './runtime';
import type { AdminBlock, AdminCollection } from '../admin/types';

export function toAdminCollection(collection: CollectionDefinition): AdminCollection {
	return {
		name: collection.name,
		label: collection.label,
		labelPlural: collection.labelPlural,
		icon: collection.icon,
		titleField: collection.titleField,
		fields: collection.fields,
		blocks: collection.blocks ? [...collection.blocks] : [],
		editorView: collection.editor?.view ?? 'form'
	};
}

export function toAdminBlock(block: BlockDefinition): AdminBlock {
	return {
		name: block.name,
		label: block.label,
		description: block.description,
		icon: block.icon,
		version: block.version,
		fields: block.fields
	};
}

export const adminCollections = (): AdminCollection[] =>
	Object.values(getRuntime().registry.collections).map(toAdminCollection);
export const adminBlocks = (): Record<string, AdminBlock> =>
	Object.fromEntries(
		Object.values(getRuntime().registry.blocks).map((block) => [block.name, toAdminBlock(block)])
	);
