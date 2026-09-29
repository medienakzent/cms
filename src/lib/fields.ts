/**
 * Feld-Definitionen — die EINZIGE Quelle der Wahrheit für einen Inhaltstyp.
 *
 * Aus einer `FieldMap` werden abgeleitet (ohne weiteren Code):
 *   - der TypeScript-Typ der Svelte-Komponente     → `InferFields` in types.ts
 *   - die Validierung beim Speichern (API + Admin) → validate.ts
 *   - das Admin-Formular                           → admin/FieldEditor.svelte
 *   - die Aufteilung in Basis + Sprach-Overlay     → localize.ts
 *
 * Regel für `localized`: Ein Feld ist entweder komplett übersetzbar oder gar
 * nicht. Innerhalb einer `group` dürfen einzelne Blätter `localized` sein;
 * innerhalb einer `list` NICHT (die ganze Liste ist dann übersetzbar).
 */

export interface FieldBase {
	kind: string;
	/** Beschriftung im Admin. Ohne Angabe wird der Schlüssel benutzt. */
	label?: string;
	/** Hilfetext unter dem Feld. */
	help?: string;
	/** Pflichtfeld — wird nur beim Veröffentlichen erzwungen, Entwürfe dürfen leer sein. */
	required?: boolean;
	/** Wert wird pro Sprache gespeichert (Overlay-Datei). */
	localized?: boolean;
	/** Formularbreite im Admin. */
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
/** Markdown. Gerendert wird mit `<Richtext>` aus `@medienakzent/cms/render`. */
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
/** ISO-Datum (`YYYY-MM-DD`) oder mit `withTime` ISO-Zeitstempel. */
export interface DateField extends FieldBase {
	kind: 'date';
	default?: string;
	withTime?: boolean;
}
export type SelectOption<O extends string = string> = O | { value: O; label: string };
export interface SelectField<O extends string = string> extends FieldBase {
	kind: 'select';
	options: readonly SelectOption<O>[];
	default?: O | null;
}
export interface MultiselectField<O extends string = string> extends FieldBase {
	kind: 'multiselect';
	options: readonly SelectOption<O>[];
	default?: O[];
}
export interface MediaField extends FieldBase {
	kind: 'media';
	accept?: 'image' | 'video' | 'file' | 'any';
}
export interface LinkField extends FieldBase {
	kind: 'link';
}
/** Verweis auf genau ein Dokument einer Collection (gespeichert wird der Slug). */
export interface ReferenceField extends FieldBase {
	kind: 'reference';
	collection: string;
}
/** Verweise auf mehrere Dokumente einer Collection (z. B. Tags). */
export interface ReferencesField extends FieldBase {
	kind: 'references';
	collection: string;
}
export interface ListField<I extends Field = Field> extends FieldBase {
	kind: 'list';
	of: I;
	min?: number;
	max?: number;
	/** Beschriftung eines Eintrags („Frage", „Bild", …). */
	itemLabel?: string;
}
export interface GroupField<G extends FieldMap = FieldMap> extends FieldBase {
	kind: 'group';
	fields: G;
}
/**
 * Datei-Upload — nur in Mail-Vorlagen (Formulare). Die Datei wird im Storage abgelegt,
 * die Mail enthält einen Download-Link. `accept`: MIME-Typen, `maxSize` in Bytes.
 */
export interface FileField extends FieldBase {
	kind: 'file';
	accept?: readonly string[];
	maxSize?: number;
}
/** Verschachtelte Blocks (z. B. Spalten). Ohne `allow` sind alle Blocks erlaubt. */
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

type Opts<F extends Field> = Omit<F, 'kind'>;

/** Feld-Builder — `f.text({ localized: true, required: true })`. */
export const f = {
	text: (o: Opts<TextField> = {}): TextField => ({ kind: 'text', ...o }),
	textarea: (o: Opts<TextareaField> = {}): TextareaField => ({ kind: 'textarea', ...o }),
	richtext: (o: Opts<RichtextField> = {}): RichtextField => ({ kind: 'richtext', ...o }),
	number: (o: Opts<NumberField> = {}): NumberField => ({ kind: 'number', ...o }),
	boolean: (o: Opts<BooleanField> = {}): BooleanField => ({ kind: 'boolean', ...o }),
	date: (o: Opts<DateField> = {}): DateField => ({ kind: 'date', ...o }),
	select: <const O extends string>(
		options: readonly SelectOption<O>[],
		o: Omit<SelectField<O>, 'kind' | 'options'> = {}
	): SelectField<O> => ({ kind: 'select', options, ...o }),
	multiselect: <const O extends string>(
		options: readonly SelectOption<O>[],
		o: Omit<MultiselectField<O>, 'kind' | 'options'> = {}
	): MultiselectField<O> => ({ kind: 'multiselect', options, ...o }),
	media: (o: Opts<MediaField> = {}): MediaField => ({ kind: 'media', ...o }),
	link: (o: Opts<LinkField> = {}): LinkField => ({ kind: 'link', ...o }),
	reference: (collection: string, o: Omit<ReferenceField, 'kind' | 'collection'> = {}): ReferenceField => ({
		kind: 'reference',
		collection,
		...o
	}),
	references: (
		collection: string,
		o: Omit<ReferencesField, 'kind' | 'collection'> = {}
	): ReferencesField => ({ kind: 'references', collection, ...o }),
	list: <const I extends Field>(of: I, o: Omit<ListField<I>, 'kind' | 'of'> = {}): ListField<I> => ({
		kind: 'list',
		of,
		...o
	}),
	group: <const G extends FieldMap>(
		fields: G,
		o: Omit<GroupField<G>, 'kind' | 'fields'> = {}
	): GroupField<G> => ({ kind: 'group', fields, ...o }),
	blocks: (o: Opts<BlocksField> = {}): BlocksField => ({ kind: 'blocks', ...o }),
	file: (o: Opts<FileField> = {}): FileField => ({ kind: 'file', ...o })
};

export function optionValue(o: SelectOption): string {
	return typeof o === 'string' ? o : o.value;
}
export function optionLabel(o: SelectOption): string {
	return typeof o === 'string' ? o : o.label;
}
export function fieldLabel(key: string, field: FieldBase): string {
	return field.label ?? key.replace(/[_-]+/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
}
