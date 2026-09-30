import type { BlocksField, BooleanField, DateField, Field, FileField, FieldMap, GroupField, LinkField, ListField, MediaField, MultiselectField, NumberField, ReferenceField, ReferencesField, RichtextField, SelectField, TextareaField, TextField } from './fields';
/** Snapshot of a media file so rendering needs no database. */
export interface MediaRef {
    id: string;
    /** Path relative to the storage (`media/2026/09/abc.jpg`); public URL: `/${src}`. */
    src: string;
    mime: string;
    kind: 'image' | 'video' | 'file';
    width: number | null;
    height: number | null;
    alt: string;
    /** Image variants (webp), keyed as in `cms.config.ts` (thumb, md, lg). */
    variants: Record<string, string>;
}
/** Uploaded file of a form submission (stored under storage/mail/uploads). */
export interface FileRef {
    name: string;
    size: number;
    mime: string;
    /** Path relative to the storage. */
    path: string;
    /** Public download URL with token. */
    url: string;
}
export interface Link {
    href: string;
    label: string;
    target: '_self' | '_blank';
}
/** Block as seen by the renderer and the component: already in ONE language. */
export interface RenderBlock<Data = Record<string, unknown>> {
    id: string;
    type: string;
    data: Data;
}
export type InferField<Definition extends Field> = Definition extends TextField | TextareaField | RichtextField | DateField ? string : Definition extends NumberField ? number | null : Definition extends BooleanField ? boolean : Definition extends SelectField<infer Option> ? Option | null : Definition extends MultiselectField<infer Option> ? Option[] : Definition extends MediaField ? MediaRef | null : Definition extends LinkField ? Link | null : Definition extends ReferenceField ? string | null : Definition extends ReferencesField ? string[] : Definition extends ListField<infer Item extends Field> ? InferField<Item>[] : Definition extends GroupField<infer Fields extends FieldMap> ? InferFields<Fields> : Definition extends BlocksField ? RenderBlock[] : Definition extends FileField ? FileRef | null : never;
export type InferFields<Fields extends FieldMap> = {
    [Key in keyof Fields]: InferField<Fields[Key]>;
};
export type DocumentStatus = 'draft' | 'published';
export interface LangMeta {
    lang: string;
    status: DocumentStatus;
    updatedAt: string;
    updatedBy: string;
    publishedAt: string | null;
}
/** A document in ONE language, as returned by `cms.collection(...).get()`. */
export interface Document<Fields extends FieldMap = FieldMap> {
    id: string;
    collection: string;
    slug: string;
    lang: string;
    status: DocumentStatus;
    createdAt: string;
    updatedAt: string;
    updatedBy: string;
    publishedAt: string | null;
    /** All languages the document exists in, including status. */
    langs: LangMeta[];
    fields: InferFields<Fields>;
    blocks: RenderBlock[];
}
/** What admin and API send on save: fields and blocks of one language. */
export interface DocumentInput {
    fields: Record<string, unknown>;
    blocks: RenderBlock[];
}
export interface ValidationIssue {
    path: string;
    message: string;
}
/** `content/<collection>/<slug>.json`: structure and non-localized values. */
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
/** `content/<collection>/<slug>.<lang>.json`: localized values only. */
export interface OverlayFile {
    lang: string;
    status: DocumentStatus;
    updatedAt: string;
    updatedBy: string;
    publishedAt: string | null;
    fields: Record<string, unknown>;
    /** Localized block data addressed by the stable block id. */
    blocks: Record<string, Record<string, unknown>>;
}
export interface VersionInfo {
    id: string;
    /** `base` or a language code */
    part: string;
    savedAt: string;
    savedBy: string;
    size: number;
}
/** Index row (database), derived and rebuildable from the storage at any time. */
export interface IndexRow {
    collection: string;
    slug: string;
    lang: string;
    id: string;
    status: DocumentStatus;
    title: string;
    excerpt: string;
    /** References `collection:slug` (reference/references fields) for reverse lookup. */
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
