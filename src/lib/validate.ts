import type { Field, FieldMap } from './fields';
import { optionValue } from './fields';
import type { BlockDefinition } from './block';
import type { FileRef, Link, MediaRef, RenderBlock, ValidationIssue } from './types';

export function isEmptyValue(value: unknown): boolean {
	if (value === undefined || value === null) return true;
	if (typeof value === 'string') return value.trim() === '';
	if (Array.isArray(value)) return value.length === 0;
	return false;
}

/** Empty value set for new documents and blocks. */
export function emptyValues(fields: FieldMap): Record<string, unknown> {
	const out: Record<string, unknown> = {};
	for (const [key, field] of Object.entries(fields)) out[key] = defaultValue(field);
	return out;
}

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
			for (const [key, groupField] of Object.entries(field.fields))
				out[key] = defaultValue(groupField);
			return out;
		}
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Coerces a raw value (storage, API) into the shape `InferField` promises. */
export function normalizeField(field: Field, value: unknown): unknown {
	switch (field.kind) {
		case 'text':
		case 'textarea':
		case 'richtext':
		case 'date':
			return typeof value === 'string' ? value : (field.default ?? '');
		case 'number':
			return typeof value === 'number' && Number.isFinite(value) ? value : (field.default ?? null);
		case 'boolean':
			// Forms send strings ('on', 'ja', 'true'); anything else counts as unset.
			if (typeof value === 'boolean') return value;
			if (typeof value === 'string')
				return ['true', 'on', '1', 'ja', 'yes'].includes(value.trim().toLowerCase());
			return field.default ?? false;
		case 'select':
			return typeof value === 'string' ? value : (field.default ?? null);
		case 'multiselect':
			return Array.isArray(value)
				? value.filter((entry) => typeof entry === 'string')
				: [...(field.default ?? [])];
		case 'media':
			return isRecord(value) && typeof value.id === 'string' && typeof value.src === 'string'
				? ({
						id: value.id,
						src: value.src,
						mime: typeof value.mime === 'string' ? value.mime : 'application/octet-stream',
						kind: value.kind === 'image' || value.kind === 'video' ? value.kind : 'file',
						width: typeof value.width === 'number' ? value.width : null,
						height: typeof value.height === 'number' ? value.height : null,
						alt: typeof value.alt === 'string' ? value.alt : '',
						variants: isRecord(value.variants) ? (value.variants as Record<string, string>) : {}
					} satisfies MediaRef)
				: null;
		case 'link':
			return isRecord(value) && typeof value.href === 'string'
				? ({
						href: value.href,
						label: typeof value.label === 'string' ? value.label : '',
						target: value.target === '_blank' ? '_blank' : '_self'
					} satisfies Link)
				: null;
		case 'reference':
			return typeof value === 'string' && value ? value : null;
		case 'references':
			return Array.isArray(value)
				? value.filter((entry): entry is string => typeof entry === 'string' && !!entry)
				: [];
		case 'list':
			return Array.isArray(value) ? value.map((item) => normalizeField(field.of, item)) : [];
		case 'group': {
			const source = isRecord(value) ? value : {};
			const out: Record<string, unknown> = {};
			for (const [key, groupField] of Object.entries(field.fields))
				out[key] = normalizeField(groupField, source[key]);
			return out;
		}
		case 'file':
			return isRecord(value) &&
				typeof value.name === 'string' &&
				typeof value.size === 'number' &&
				typeof value.path === 'string'
				? ({
						name: value.name,
						size: value.size,
						mime: typeof value.mime === 'string' ? value.mime : 'application/octet-stream',
						path: value.path,
						url: typeof value.url === 'string' ? value.url : ''
					} satisfies FileRef)
				: null;
		case 'blocks':
			return Array.isArray(value)
				? value
						.filter(
							(block): block is RenderBlock => isRecord(block) && typeof block.type === 'string'
						)
						.map((block) => ({
							id: typeof block.id === 'string' ? block.id : crypto.randomUUID().slice(0, 8),
							type: block.type,
							data: isRecord(block.data) ? block.data : {}
						}))
				: [];
	}
}

export function normalizeFields(fields: FieldMap, value: unknown): Record<string, unknown> {
	const source = isRecord(value) ? value : {};
	const out: Record<string, unknown> = {};
	for (const [key, field] of Object.entries(fields)) out[key] = normalizeField(field, source[key]);
	return out;
}

export interface ValidateContext {
	/** Enforce required fields (publish). */
	strict: boolean;
	blocks: Record<string, BlockDefinition>;
}

/** Validates already normalized values; collects issues (empty = ok). */
export function validateField(
	field: Field,
	value: unknown,
	path: string,
	context: ValidateContext,
	issues: ValidationIssue[]
): void {
	if (field.required && context.strict && isEmptyValue(value)) {
		issues.push({ path, message: 'Pflichtfeld' });
		return;
	}
	// A required checkbox (consent, for example) must be checked.
	if (field.kind === 'boolean' && field.required && context.strict && value !== true) {
		issues.push({ path, message: 'Bitte bestätigen' });
		return;
	}
	switch (field.kind) {
		case 'text':
		case 'textarea':
			if (typeof value === 'string' && field.maxLength && value.length > field.maxLength)
				issues.push({ path, message: `Maximal ${field.maxLength} Zeichen` });
			break;
		case 'number':
			if (typeof value === 'number') {
				if (field.integer && !Number.isInteger(value))
					issues.push({ path, message: 'Ganzzahl erwartet' });
				if (field.min !== undefined && value < field.min)
					issues.push({ path, message: `Mindestens ${field.min}` });
				if (field.max !== undefined && value > field.max)
					issues.push({ path, message: `Höchstens ${field.max}` });
			}
			break;
		case 'date':
			if (typeof value === 'string' && value && Number.isNaN(Date.parse(value)))
				issues.push({ path, message: 'Ungültiges Datum' });
			break;
		case 'select':
			if (
				typeof value === 'string' &&
				!field.options.some((option) => optionValue(option) === value)
			)
				issues.push({ path, message: `Ungültige Auswahl „${value}"` });
			break;
		case 'multiselect':
			if (Array.isArray(value))
				for (const entry of value)
					if (!field.options.some((option) => optionValue(option) === entry))
						issues.push({ path, message: `Ungültige Auswahl „${entry}"` });
			break;
		case 'media':
			if (
				value &&
				field.accept &&
				field.accept !== 'any' &&
				(value as MediaRef).kind !== field.accept
			)
				issues.push({ path, message: `Nur ${field.accept} erlaubt` });
			break;
		case 'link':
			if (value && context.strict && !(value as Link).href)
				issues.push({ path, message: 'Link ohne Ziel' });
			break;
		case 'list': {
			const items = Array.isArray(value) ? value : [];
			if (field.min !== undefined && context.strict && items.length < field.min)
				issues.push({ path, message: `Mindestens ${field.min} Einträge` });
			if (field.max !== undefined && items.length > field.max)
				issues.push({ path, message: `Höchstens ${field.max} Einträge` });
			items.forEach((item, index) =>
				validateField(field.of, item, `${path}[${index}]`, context, issues)
			);
			break;
		}
		case 'group':
			validateFields(
				field.fields,
				value as Record<string, unknown>,
				context,
				issues,
				path ? `${path}.` : ''
			);
			break;
		case 'file':
			if (value && field.maxSize && (value as FileRef).size > field.maxSize)
				issues.push({ path, message: `Maximal ${Math.round(field.maxSize / 1048576)} MB` });
			break;
		case 'blocks':
			validateBlocks(
				value as RenderBlock[],
				field.allow ?? Object.keys(context.blocks),
				context,
				issues,
				path
			);
			if (field.max !== undefined && Array.isArray(value) && value.length > field.max)
				issues.push({ path, message: `Höchstens ${field.max} Blocks` });
			break;
	}
}

export function validateFields(
	fields: FieldMap,
	value: Record<string, unknown>,
	context: ValidateContext,
	issues: ValidationIssue[] = [],
	prefix = ''
): ValidationIssue[] {
	for (const [key, field] of Object.entries(fields)) {
		validateField(field, value?.[key], `${prefix}${key}`, context, issues);
	}
	return issues;
}

export function validateBlocks(
	blocks: RenderBlock[],
	allowed: readonly string[],
	context: ValidateContext,
	issues: ValidationIssue[] = [],
	prefix = 'blocks'
): ValidationIssue[] {
	const seen = new Set<string>();
	blocks.forEach((block, index) => {
		const path = `${prefix}[${index}]`;
		if (seen.has(block.id)) issues.push({ path, message: `Doppelte Block-ID „${block.id}"` });
		seen.add(block.id);
		const definition = context.blocks[block.type];
		if (!definition) {
			issues.push({ path, message: `Unbekannter Block-Typ „${block.type}"` });
			return;
		}
		if (!allowed.includes(block.type)) {
			issues.push({ path, message: `Block „${block.type}" ist hier nicht erlaubt` });
		}
		validateFields(definition.fields, block.data, context, issues, `${path}.`);
	});
	return issues;
}
