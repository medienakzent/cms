import type { EditorView } from '../collection';
import type { FieldMap } from '../fields';

/** Serializable view of the definitions for the client (no functions). */
export interface AdminCollection {
	name: string;
	label: string;
	labelPlural: string;
	icon?: string;
	titleField: string;
	fields: FieldMap;
	blocks: string[];
	/** Default editor layout of the collection. */
	editorView: EditorView;
}

export interface AdminBlock {
	name: string;
	label: string;
	description?: string;
	icon?: string;
	version: number;
	fields: FieldMap;
}
