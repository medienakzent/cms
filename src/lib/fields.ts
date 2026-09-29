/**
 * Field definitions are the single source of truth for a content type: the component
 * props (types.ts), validation (validate.ts), the admin form (admin/FieldEditor.svelte)
 * and the base/overlay split (localize.ts) are all derived from a `FieldMap`.
 *
 * `localized` is all-or-nothing per field. Leaves inside a `group` may be localized
 * individually; inside a `list` they may not (the whole list is localized instead).
 */

export interface FieldBase {
	kind: string;
	/** Falls back to the key when missing. */
	label?: string;
	help?: string;
	/** Enforced only on publish; drafts may stay empty. */
	required?: boolean;
	/** Stored per language in the overlay file. */
	localized?: boolean;
	width?: 'full' | 'half';
}

export interface TextField extends FieldBase {
	kind: 'text';
	default?: string;
	maxLength?: number;
	placeholder?: string;
}
export interface TextareaField extends FieldBase {
	kind: 'textarea';
	default?: string;
	rows?: number;
	maxLength?: number;
}
/** Markdown, rendered with `<Richtext>` from `@medienakzent/cms/render`. */
export interface RichtextField extends FieldBase {
	kind: 'richtext';
	default?: string;
}
export interface NumberField extends FieldBase {
	kind: 'number';
	default?: number | null;
	min?: number;
	max?: number;
	step?: number;
	integer?: boolean;
}
export interface BooleanField extends FieldBase {
	kind: 'boolean';
	default?: boolean;
}
/** ISO date (`YYYY-MM-DD`), or an ISO timestamp with `withTime`. */
export interface DateField extends FieldBase {
	kind: 'date';
	default?: string;
	withTime?: boolean;
}
export type SelectOption<Option extends string = string> =
	Option | { value: Option; label: string };
export interface SelectField<Option extends string = string> extends FieldBase {
	kind: 'select';
	options: readonly SelectOption<Option>[];
	default?: Option | null;
}
export interface MultiselectField<Option extends string = string> extends FieldBase {
	kind: 'multiselect';
	options: readonly SelectOption<Option>[];
	default?: Option[];
}
export interface MediaField extends FieldBase {
	kind: 'media';
	accept?: 'image' | 'video' | 'file' | 'any';
}
export interface LinkField extends FieldBase {
	kind: 'link';
}
/** Reference to one document of a collection; the slug is stored. */
export interface ReferenceField extends FieldBase {
	kind: 'reference';
	collection: string;
}
/** References to several documents of a collection (tags, for example). */
export interface ReferencesField extends FieldBase {
	kind: 'references';
	collection: string;
}
export interface ListField<Item extends Field = Field> extends FieldBase {
	kind: 'list';
	of: Item;
	min?: number;
	max?: number;
	itemLabel?: string;
}
export interface GroupField<Fields extends FieldMap = FieldMap> extends FieldBase {
	kind: 'group';
	fields: Fields;
}
/**
 * File upload, only in mail templates. The file is stored in the storage and the mail
 * carries a download link. `accept`: MIME types, `maxSize` in bytes.
 */
export interface FileField extends FieldBase {
	kind: 'file';
	accept?: readonly string[];
	maxSize?: number;
}
/** Nested blocks (columns, for example). Without `allow` every block is permitted. */
export interface BlocksField extends FieldBase {
	kind: 'blocks';
	allow?: readonly string[];
	max?: number;
}

export type Field =
	| TextField
	| TextareaField
	| RichtextField
	| NumberField
	| BooleanField
	| DateField
	| SelectField<string>
	| MultiselectField<string>
	| MediaField
	| LinkField
	| ReferenceField
	| ReferencesField
	| ListField<Field>
	| GroupField<FieldMap>
	| BlocksField
	| FileField;

export type FieldMap = Record<string, Field>;

type Options<FieldType extends Field> = Omit<FieldType, 'kind'>;

/** Field builder: `field.text({ localized: true, required: true })`. */
export const field = {
	text: (options: Options<TextField> = {}): TextField => ({ kind: 'text', ...options }),
	textarea: (options: Options<TextareaField> = {}): TextareaField => ({
		kind: 'textarea',
		...options
	}),
	richtext: (options: Options<RichtextField> = {}): RichtextField => ({
		kind: 'richtext',
		...options
	}),
	number: (options: Options<NumberField> = {}): NumberField => ({ kind: 'number', ...options }),
	boolean: (options: Options<BooleanField> = {}): BooleanField => ({
		kind: 'boolean',
		...options
	}),
	date: (options: Options<DateField> = {}): DateField => ({ kind: 'date', ...options }),
	select: <const Option extends string>(
		choices: readonly SelectOption<Option>[],
		options: Omit<SelectField<Option>, 'kind' | 'options'> = {}
	): SelectField<Option> => ({ kind: 'select', options: choices, ...options }),
	multiselect: <const Option extends string>(
		choices: readonly SelectOption<Option>[],
		options: Omit<MultiselectField<Option>, 'kind' | 'options'> = {}
	): MultiselectField<Option> => ({ kind: 'multiselect', options: choices, ...options }),
	media: (options: Options<MediaField> = {}): MediaField => ({ kind: 'media', ...options }),
	link: (options: Options<LinkField> = {}): LinkField => ({ kind: 'link', ...options }),
	reference: (
		collection: string,
		options: Omit<ReferenceField, 'kind' | 'collection'> = {}
	): ReferenceField => ({
		kind: 'reference',
		collection,
		...options
	}),
	references: (
		collection: string,
		options: Omit<ReferencesField, 'kind' | 'collection'> = {}
	): ReferencesField => ({ kind: 'references', collection, ...options }),
	list: <const Item extends Field>(
		of: Item,
		options: Omit<ListField<Item>, 'kind' | 'of'> = {}
	): ListField<Item> => ({
		kind: 'list',
		of,
		...options
	}),
	group: <const Fields extends FieldMap>(
		fields: Fields,
		options: Omit<GroupField<Fields>, 'kind' | 'fields'> = {}
	): GroupField<Fields> => ({ kind: 'group', fields, ...options }),
	blocks: (options: Options<BlocksField> = {}): BlocksField => ({ kind: 'blocks', ...options }),
	file: (options: Options<FileField> = {}): FileField => ({ kind: 'file', ...options })
};

export function optionValue(option: SelectOption): string {
	return typeof option === 'string' ? option : option.value;
}
export function optionLabel(option: SelectOption): string {
	return typeof option === 'string' ? option : option.label;
}
export function fieldLabel(key: string, fieldDefinition: FieldBase): string {
	return (
		fieldDefinition.label ??
		key.replace(/[_-]+/g, ' ').replace(/^\w/, (character) => character.toUpperCase())
	);
}
