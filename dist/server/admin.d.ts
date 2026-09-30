import type { BlockDefinition } from '../block';
import type { CollectionDefinition } from '../collection';
import type { AdminBlock, AdminCollection } from '../admin/types';
export declare function toAdminCollection(collection: CollectionDefinition): AdminCollection;
export declare function toAdminBlock(block: BlockDefinition): AdminBlock;
export declare const adminCollections: () => AdminCollection[];
export declare const adminBlocks: () => Record<string, AdminBlock>;
