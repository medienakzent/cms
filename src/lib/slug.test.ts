import { describe, expect, it } from 'vitest';
import { isValidSlug, slugify } from './slug';

describe('slugify', () => {
	it('transliterates umlauts and strips other characters', () => {
		expect(slugify('Über uns & Team!')).toBe('ueber-uns-team');
		expect(slugify('  Straße  ')).toBe('strasse');
		expect(slugify('Café Ñandú')).toBe('cafe-nandu');
	});
	it('limits the length', () => {
		expect(slugify('a'.repeat(100)).length).toBe(80);
	});
});

describe('isValidSlug', () => {
	it('accepts lowercase words with dashes', () => {
		expect(isValidSlug('ueber-uns')).toBe(true);
		expect(isValidSlug('a')).toBe(true);
	});
	it('rejects traversal, uppercase and edge dashes', () => {
		for (const slug of ['', '-a', 'a-', 'A', 'a b', '../x', 'a--b'.repeat(30)])
			expect(isValidSlug(slug), slug).toBe(false);
	});
});
