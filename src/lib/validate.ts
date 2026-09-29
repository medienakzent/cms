import type { Field, FieldMap } from './fields';
import { optionValue } from './fields';
import type { BlockDefinition } from './block';
import type { FileRef, Link, MediaRef, RenderBlock, ValidationIssue } from './types';

export function defaultValue(field: Field): unknown {
	switch (field.kind) {
		case 'text':
		case 'textarea':
		case 'richtext':
		case 'date':
			return field.default ?? '';
		case 'number':
			return field.default ?? null;
		case 'boolean':
			return field.default ?? false;
		case 'select':
			return field.default ?? null;
		case 'multiselect':
			return field.default ? [...field.default] : [];
		case 'media':
		case 'link':
		case 'reference':
		case 'file':
			return null;
		case 'references':
		case 'list':
		case 'blocks':
			return [];
		case 'group': {
			const out: Record<string, unknown> = {};
			for (const [k, f] of Object.entries(field.fields)) out[k] = defaultValue(f);
			return out;
		}
	}
}

function isRecord(v: unknown): v is Record<string, unknown> {
	return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Bringt einen rohen Wert (Storage, API) auf die Form, die `InferField` verspricht. */
export function normalizeField(field: Field, v: unknown): unknown {
	switch (field.kind) {
		case 'text':
		case 'textarea':
		case 'richtext':
		case 'date':
			return typeof v === 'string' ? v : (field.default ?? '');
		case 'number':
			return typeof v === 'number' && Number.isFinite(v) ? v : (field.default ?? null);
		case 'boolean':
			// Formulare liefern Strings ('on', 'ja', 'true'); alles andere gilt als nicht gesetzt.
			if (typeof v === 'boolean') return v;
			if (typeof v === 'string')
				return ['true', 'on', '1', 'ja', 'yes'].includes(v.trim().toLowerCase());
			return field.default ?? false;
		case 'select':
			return typeof v === 'string' ? v : (field.default ?? null);
		case 'multiselect':
			return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [...(field.default ?? [])];
		case 'media':
			return isRecord(v) && typeof v.id === 'string' && typeof v.src === 'string'
				? ({
						id: v.id,
						src: v.src,
						mime: typeof v.mime === 'string' ? v.mime : 'application/octet-stream',
						kind: v.kind === 'image' || v.kind === 'video' ? v.kind : 'file',
						width: typeof v.width === 'number' ? v.width : null,
						height: typeof v.height === 'number' ? v.height : null,
						alt: typeof v.alt === 'string' ? v.alt : '',
						variants: isRecord(v.variants) ? (v.variants as Record<string, string>) : {}
					} satisfies MediaRef)
				: null;
		case 'link':
			return isRecord(v) && typeof v.href === 'string'
				? ({
						href: v.href,
						label: typeof v.label === 'string' ? v.label : '',
						target: v.target === '_blank' ? '_blank' : '_self'
					} satisfies Link)
				: null;
		case 'reference':
			return typeof v === 'string' && v ? v : null;
		case 'references':
			return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && !!x) : [];
		case 'list':
			return Array.isArray(v) ? v.map((item) => normalizeField(field.of, item)) : [];
		case 'group': {
			const src = isRecord(v) ? v : {};
			const out: Record<string, unknown> = {};
			for (const [k, f] of Object.entries(field.fields)) out[k] = normalizeField(f, src[k]);
			return out;
		}
		case 'file':
			return isRecord(v) &&
				typeof v.name === 'string' &&
				typeof v.size === 'number' &&
				typeof v.path === 'string'
				? ({
						name: v.name,
						size: v.size,
						mime: typeof v.mime === 'string' ? v.mime : 'application/octet-stream',
						path: v.path,
						url: typeof v.url === 'string' ? v.url : ''
					} satisfies FileRef)
				: null;
		case 'blocks':
			return Array.isArray(v)
				? v
						.filter((b): b is RenderBlock => isRecord(b) && typeof b.type === 'string')
						.map((b) => ({
							id: typeof b.id === 'string' ? b.id : crypto.randomUUID().slice(0, 8),
							type: b.type,
							data: isRecord(b.data) ? b.data : {}
						}))
				: [];
	}
}

export function normalizeFields(fields: FieldMap, value: unknown): Record<string, unknown> {
	const src = isRecord(value) ? value : {};
	const out: Record<string, unknown> = {};
	for (const [k, f] of Object.entries(fields)) out[k] = normalizeField(f, src[k]);
	return out;
}

export interface ValidateContext {
	/** Pflichtfelder erzwingen (Veröffentlichen). */
	strict: boolean;
	blocks: Record<string, BlockDefinition>;
}

function isEmpty(v: unknown): boolean {
	return (
		v === null ||
		v === undefined ||
		(typeof v === 'string' && v.trim() === '') ||
		(Array.isArray(v) && v.length === 0)
	);
}

/** Validiert bereits normalisierte Werte. Liefert eine Liste von Problemen (leer = ok). */
export function validateField(
	field: Field,
	v: unknown,
	path: string,
	ctx: ValidateContext,
	issues: ValidationIssue[]
): void {
	if (field.required && ctx.strict && isEmpty(v)) {
		issues.push({ path, message: 'Pflichtfeld' });
		return;
	}
	// Pflicht-Checkbox (z. B. Einwilligung) muss gesetzt sein.
	if (field.kind === 'boolean' && field.required && ctx.strict && v !== true) {
		issues.push({ path, message: 'Bitte bestätigen' });
		return;
	}
	switch (field.kind) {
		case 'text':
		case 'textarea':
			if (typeof v === 'string' && field.maxLength && v.length > field.maxLength)
				issues.push({ path, message: `Maximal ${field.maxLength} Zeichen` });
			break;
		case 'number':
			if (typeof v === 'number') {
				if (field.integer && !Number.isInteger(v))
					issues.push({ path, message: 'Ganzzahl erwartet' });
				if (field.min !== undefined && v < field.min)
					issues.push({ path, message: `Mindestens ${field.min}` });
				if (field.max !== undefined && v > field.max)
					issues.push({ path, message: `Höchstens ${field.max}` });
			}
			break;
		case 'date':
			if (typeof v === 'string' && v && Number.isNaN(Date.parse(v)))
				issues.push({ path, message: 'Ungültiges Datum' });
			break;
		case 'select':
			if (typeof v === 'string' && !field.options.some((o) => optionValue(o) === v))
				issues.push({ path, message: `Ungültige Auswahl „${v}"` });
			break;
		case 'multiselect':
			if (Array.isArray(v))
				for (const x of v)
					if (!field.options.some((o) => optionValue(o) === x))
						issues.push({ path, message: `Ungültige Auswahl „${x}"` });
			break;
		case 'media':
			if (v && field.accept && field.accept !== 'any' && (v as MediaRef).kind !== field.accept)
				issues.push({ path, message: `Nur ${field.accept} erlaubt` });
			break;
		case 'link':
			if (v && ctx.strict && !(v as Link).href) issues.push({ path, message: 'Link ohne Ziel' });
			break;
		case 'list': {
			const arr = Array.isArray(v) ? v : [];
			if (field.min !== undefined && ctx.strict && arr.length < field.min)
				issues.push({ path, message: `Mindestens ${field.min} Einträge` });
			if (field.max !== undefined && arr.length > field.max)
				issues.push({ path, message: `Höchstens ${field.max} Einträge` });
			arr.forEach((item, i) => validateField(field.of, item, `${path}[${i}]`, ctx, issues));
			break;
		}
		case 'group':
			validateFields(
				field.fields,
				v as Record<string, unknown>,
				ctx,
				issues,
				path ? `${path}.` : ''
			);
			break;
		case 'file':
			if (v && field.maxSize && (v as FileRef).size > field.maxSize)
				issues.push({ path, message: `Maximal ${Math.round(field.maxSize / 1048576)} MB` });
			break;
		case 'blocks':
			validateBlocks(v as RenderBlock[], field.allow ?? Object.keys(ctx.blocks), ctx, issues, path);
			if (field.max !== undefined && Array.isArray(v) && v.length > field.max)
				issues.push({ path, message: `Höchstens ${field.max} Blocks` });
			break;
	}
}

export function validateFields(
	fields: FieldMap,
	value: Record<string, unknown>,
	ctx: ValidateContext,
	issues: ValidationIssue[] = [],
	prefix = ''
): ValidationIssue[] {
	for (const [key, field] of Object.entries(fields)) {
		validateField(field, value?.[key], `${prefix}${key}`, ctx, issues);
	}
	return issues;
}

export function validateBlocks(
	blocks: RenderBlock[],
	allowed: readonly string[],
	ctx: ValidateContext,
	issues: ValidationIssue[] = [],
	prefix = 'blocks'
): ValidationIssue[] {
	const seen = new Set<string>();
	blocks.forEach((block, i) => {
		const path = `${prefix}[${i}]`;
		if (seen.has(block.id)) issues.push({ path, message: `Doppelte Block-ID „${block.id}"` });
		seen.add(block.id);
		const def = ctx.blocks[block.type];
		if (!def) {
			issues.push({ path, message: `Unbekannter Block-Typ „${block.type}"` });
			return;
		}
		if (!allowed.includes(block.type)) {
			issues.push({ path, message: `Block „${block.type}" ist hier nicht erlaubt` });
		}
		validateFields(def.fields, block.data, ctx, issues, `${path}.`);
	});
	return issues;
}
