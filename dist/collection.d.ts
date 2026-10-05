import type { FieldMap } from './fields';
import type { Migration } from './block';
import type { Document } from './types';
/**
 * Editor layout: block forms only, forms and preview side by side, or the preview alone with
 * direct editing. Editors can switch; this is the default per collection.
 */
export type EditorView = 'form' | 'split' | 'preview';
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
    sortBy: {
        field: string;
        direction: 'asc' | 'desc';
    };
    /** Public path of a document; `null` = not directly reachable. */
    path: (slug: string, lang: string) => string | null;
    migrate?: Record<number, Migration>;
    editor?: {
        view: EditorView;
    };
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
    sortBy?: {
        field: string;
        direction: 'asc' | 'desc';
    };
    path?: (slug: string, lang: string) => string | null;
    migrate?: Record<number, Migration>;
    /** Default editor layout (`form` if omitted). */
    editor?: {
        view?: EditorView;
    };
}
export declare function defineCollection<const Fields extends FieldMap>(options: CollectionOptions<Fields>): CollectionDefinition<Fields>;
/** Document type of a collection: `DocumentOf<typeof pages>`. */
export type DocumentOf<Collection> = Collection extends CollectionDefinition<infer Fields> ? Document<Fields> : never;
/**
 * Global content file `src/cms.content.ts`: bundles additional collections in one place,
 * as an alternative or addition to single files in src/collections/.
 *
 *   export default defineContent({ collections: [defineCollection({...}), ...] });
 */
export interface ContentDefinition {
    collections: CollectionDefinition[];
}
export declare function defineContent(options: {
    collections?: CollectionDefinition[];
}): ContentDefinition;
