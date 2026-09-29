import type {
	BlocksField,
	BooleanField,
	DateField,
	Field,
	FileField,
	FieldMap,
	GroupField,
	LinkField,
	ListField,
	MediaField,
	MultiselectField,
	NumberField,
	ReferenceField,
	ReferencesField,
	RichtextField,
	SelectField,
	TextareaField,
	TextField
} from './fields';

/** Verweis auf eine Mediendatei — Snapshot, damit das Rendern keine DB braucht. */
export interface MediaRef {
	id: string;
	/** Pfad relativ zum Storage (`media/2026/09/abc.jpg`); öffentliche URL: `/${src}`. */
	src: string;
	mime: string;
	kind: 'image' | 'video' | 'file';
	width: number | null;
	height: number | null;
	alt: string;
	/** Bildvarianten (webp) — Schlüssel aus `cms.config.ts` (thumb, md, lg). */
	variants: Record<string, string>;
}

/** Hochgeladene Datei einer Formular-Sendung (Ablage unter storage/mail/uploads). */
export interface FileRef {
	name: string;
	size: number;
	mime: string;
	/** Pfad relativ zum Storage. */
	path: string;
	/** Öffentliche Download-URL mit Token. */
	url: string;
}

export interface Link {
	href: string;
	label: string;
	target: '_self' | '_blank';
}

/** Block, wie ihn der Renderer und die Komponente sehen: bereits in EINER Sprache. */
export interface RenderBlock<D = Record<string, unknown>> {
	id: string;
	type: string;
	data: D;
}

export type InferField<F extends Field> = F extends
	TextField | TextareaField | RichtextField | DateField
	? string
	: F extends NumberField
		? number | null
		: F extends BooleanField
			? boolean
			: F extends SelectField<infer O>
				? O | null
				: F extends MultiselectField<infer O>
					? O[]
					: F extends MediaField
						? MediaRef | null
						: F extends LinkField
							? Link | null
							: F extends ReferenceField
								? string | null
								: F extends ReferencesField
									? string[]
									: F extends ListField<infer I extends Field>
										? InferField<I>[]
										: F extends GroupField<infer G extends FieldMap>
											? InferFields<G>
											: F extends BlocksField
												? RenderBlock[]
												: F extends FileField
													? FileRef | null
													: never;

export type InferFields<M extends FieldMap> = { [K in keyof M]: InferField<M[K]> };

export type DocumentStatus = 'draft' | 'published';

export interface LangMeta {
	lang: string;
	status: DocumentStatus;
	updatedAt: string;
	updatedBy: string;
	publishedAt: string | null;
}

/** Ein Dokument in EINER Sprache — so kommt es aus `cms.collection(...).get()`. */
export interface Document<F extends FieldMap = FieldMap> {
	id: string;
	collection: string;
	slug: string;
	lang: string;
	status: DocumentStatus;
	createdAt: string;
	updatedAt: string;
	updatedBy: string;
	publishedAt: string | null;
	/** Alle Sprachen, in denen das Dokument existiert (inkl. Status). */
	langs: LangMeta[];
	fields: InferFields<F>;
	blocks: RenderBlock[];
}

/** Was Admin und API beim Speichern schicken: Felder + Blocks einer Sprache. */
export interface DocumentInput {
	fields: Record<string, unknown>;
	blocks: RenderBlock[];
}

export interface ValidationIssue {
	path: string;
	message: string;
}

// ── Storage-Dateien ─────────────────────────────────────────────────────────

/** `content/<collection>/<slug>.json` — Struktur + nicht-lokalisierte Werte. */
export interface BaseFile {
	id: string;
	collection: string;
	slug: string;
	schemaVersion: number;
	createdAt: string;
	createdBy: string;
	updatedAt: string;
	updatedBy: string;
	fields: Record<string, unknown>;
	blocks: StoredBlock[];
}

export interface StoredBlock {
	id: string;
	type: string;
	version: number;
	data: Record<string, unknown>;
}

/** `content/<collection>/<slug>.<lang>.json` — nur lokalisierte Werte. */
export interface OverlayFile {
	lang: string;
	status: DocumentStatus;
	updatedAt: string;
	updatedBy: string;
	publishedAt: string | null;
	fields: Record<string, unknown>;
	/** Lokalisierte Block-Daten, adressiert über die stabile Block-ID. */
	blocks: Record<string, Record<string, unknown>>;
}

export interface VersionInfo {
	id: string;
	/** `base` oder Sprachcode */
	part: string;
	savedAt: string;
	savedBy: string;
	size: number;
}

/** Zeile im Index (Datenbank) — abgeleitet, jederzeit aus dem Storage neu aufbaubar. */
export interface IndexRow {
	collection: string;
	slug: string;
	lang: string;
	id: string;
	status: DocumentStatus;
	title: string;
	excerpt: string;
	/** Verweise `collection:slug` (reference/references-Felder) für Rückwärtssuche. */
	refs: string[];
	createdAt: string;
	updatedAt: string;
	updatedBy: string;
	publishedAt: string | null;
}

export interface MediaItem extends MediaRef {
	originalName: string;
	size: number;
	createdAt: string;
	createdBy: string;
}
