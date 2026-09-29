/**
 * Registry: alle Definitionen eines Projekts an einem Ort — Blocks mit ihren
 * Svelte-Komponenten, Collections, Mail-Vorlagen und die Konfiguration.
 *
 * Die Dateien werden im KUNDENPROJEKT eingesammelt (src/cms.ts, per
 * import.meta.glob) und hier geprüft. Das Paket selbst kennt keine Pfade.
 * Verstöße gegen die Konventionen brechen den Start mit klarer Meldung.
 */
import type { Component } from 'svelte';
import type { BlockDefinition } from './block';
import type { CollectionDefinition, ContentDefinition } from './collection';
import type { CmsConfig } from './config';
import type { Field } from './fields';
import type { MailTemplateDefinition } from './mail';

export type BlockComponent = Component<Record<string, unknown>>;

export interface Registry {
	config: CmsConfig;
	blocks: Record<string, BlockDefinition>;
	components: Record<string, BlockComponent>;
	collections: Record<string, CollectionDefinition>;
	mail: Record<string, MailTemplateDefinition>;
}

export interface RegistryInput {
	config: CmsConfig;
	/** Glob `blocks/<name>/block.ts` (eager, default-Export) */
	blocks: Record<string, unknown>;
	/** Glob `blocks/<name>/<Name>.svelte` (eager, default-Export) */
	components: Record<string, unknown>;
	/** Glob `collections/<name>.ts` */
	collections?: Record<string, unknown>;
	/** Glob `cms.content.ts` (optional) */
	content?: Record<string, unknown>;
	/** Glob `mail/<name>.ts` */
	mail?: Record<string, unknown>;
}

const folderOf = (path: string) => path.split('/').at(-2) ?? '';
const fileOf = (path: string) => (path.split('/').at(-1) ?? '').replace(/\.(ts|js|svelte)$/, '');

function checkReferences(owner: string, fields: Record<string, Field>, r: Registry) {
	for (const [key, field] of Object.entries(fields)) {
		if (
			(field.kind === 'reference' || field.kind === 'references') &&
			!r.collections[field.collection]
		) {
			throw new Error(`${owner}.${key}: verweist auf unbekannte Collection „${field.collection}".`);
		}
		if (field.kind === 'blocks') {
			for (const b of field.allow ?? [])
				if (!r.blocks[b]) throw new Error(`${owner}.${key}: unbekannter Block „${b}".`);
		}
		if (field.kind === 'group') checkReferences(`${owner}.${key}`, field.fields, r);
		if (field.kind === 'list') checkReferences(`${owner}.${key}[]`, { item: field.of }, r);
	}
}

export function defineRegistry(input: RegistryInput): Registry {
	const r: Registry = {
		config: input.config,
		blocks: {},
		components: {},
		collections: {},
		mail: {}
	};

	for (const [path, def] of Object.entries(input.blocks)) {
		const d = def as BlockDefinition;
		if (!d || typeof d !== 'object' || !d.name)
			throw new Error(`${path}: default export muss defineBlock(...) sein.`);
		if (d.name !== folderOf(path))
			throw new Error(
				`${path}: Block-Name „${d.name}" muss dem Ordnernamen „${folderOf(path)}" entsprechen.`
			);
		r.blocks[d.name] = d;
	}
	for (const [path, component] of Object.entries(input.components)) {
		const folder = folderOf(path);
		if (r.components[folder])
			throw new Error(`blocks/${folder}: mehr als eine .svelte-Datei — genau eine ist erlaubt.`);
		r.components[folder] = component as BlockComponent;
	}
	for (const name of Object.keys(r.blocks)) {
		if (!r.components[name])
			throw new Error(
				`blocks/${name}: Svelte-Komponente fehlt (genau eine .svelte-Datei im Ordner).`
			);
	}
	for (const [path, def] of Object.entries(input.collections ?? {})) {
		const d = def as CollectionDefinition;
		if (!d || typeof d !== 'object' || !d.name)
			throw new Error(`${path}: default export muss defineCollection(...) sein.`);
		if (d.name !== fileOf(path))
			throw new Error(
				`${path}: Collection-Name „${d.name}" muss dem Dateinamen „${fileOf(path)}" entsprechen.`
			);
		r.collections[d.name] = d;
	}
	for (const [path, content] of Object.entries(input.content ?? {})) {
		const c = content as ContentDefinition;
		if (!c || !Array.isArray(c.collections))
			throw new Error(`${path}: default export muss defineContent(...) sein.`);
		for (const d of c.collections) {
			if (r.collections[d.name])
				throw new Error(
					`${path}: Collection „${d.name}" existiert bereits (collections/${d.name}.ts).`
				);
			r.collections[d.name] = d;
		}
	}
	for (const [path, def] of Object.entries(input.mail ?? {})) {
		const d = def as MailTemplateDefinition;
		if (!d || typeof d !== 'object' || !d.name)
			throw new Error(`${path}: default export muss defineMail(...) sein.`);
		if (d.name !== fileOf(path))
			throw new Error(
				`${path}: Mail-Name „${d.name}" muss dem Dateinamen „${fileOf(path)}" entsprechen.`
			);
		r.mail[d.name] = d;
	}

	for (const c of Object.values(r.collections)) {
		for (const b of c.blocks || [])
			if (!r.blocks[b]) throw new Error(`Collection „${c.name}": unbekannter Block „${b}".`);
		checkReferences(`collections/${c.name}`, c.fields, r);
	}
	for (const b of Object.values(r.blocks)) checkReferences(`blocks/${b.name}`, b.fields, r);
	for (const m of Object.values(r.mail)) checkReferences(`mail/${m.name}`, m.fields, r);

	const home = r.config.routing.home;
	if (!r.collections[home.collection]) {
		throw new Error(
			`cms.config: routing.home.collection „${home.collection}" ist keine bekannte Collection.`
		);
	}
	return r;
}

/** Erlaubte Block-Typen einer Collection (leer, wenn keine Blocks). */
export function allowedBlocks(c: CollectionDefinition): string[] {
	return c.blocks ? [...c.blocks] : [];
}
