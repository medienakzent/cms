/**
 * Registry: every definition of a project in one place; blocks with their Svelte
 * components, collections, mail templates and the config.
 *
 * The files are collected in the CUSTOMER project (src/cms.ts via import.meta.glob) and
 * checked here; the package itself knows no paths. Convention violations fail startup
 * with a clear message.
 */
import type { Component } from 'svelte';
import type { BlockDefinition } from './block';
import type { CollectionDefinition } from './collection';
import type { CmsConfig } from './config';
import type { MailTemplateDefinition } from './mail';
import type { PreviewProps } from './preview';
export type BlockComponent = Component<Record<string, unknown>>;
/** Preview of a collection in the editor frame; receives `PreviewProps`. */
export type PreviewComponent = Component<PreviewProps>;
export interface Registry {
    config: CmsConfig;
    blocks: Record<string, BlockDefinition>;
    components: Record<string, BlockComponent>;
    collections: Record<string, CollectionDefinition>;
    mail: Record<string, MailTemplateDefinition>;
    /** Live preview per collection; collections without one preview their blocks. */
    previews: Record<string, PreviewComponent>;
}
export interface RegistryInput {
    config: CmsConfig;
    /** Glob `blocks/<name>/block.ts` (eager, default export) */
    blocks: Record<string, unknown>;
    /** Glob `blocks/<name>/<Name>.svelte` (eager, default export) */
    components: Record<string, unknown>;
    /** Glob `collections/<name>.ts` */
    collections?: Record<string, unknown>;
    /** Glob `cms.content.ts` (optional) */
    content?: Record<string, unknown>;
    /** Glob `mail/<name>.ts` */
    mail?: Record<string, unknown>;
    /** Glob `previews/<collection>.svelte` (optional): editor live preview of a collection */
    previews?: Record<string, unknown>;
}
export declare function defineRegistry(input: RegistryInput): Registry;
/** Allowed block types of a collection (empty when it has no blocks). */
export declare function allowedBlocks(collection: CollectionDefinition): string[];
