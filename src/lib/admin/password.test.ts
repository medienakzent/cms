import { describe, expect, it } from 'vitest';
import { generatePassword } from './password';

describe('generatePassword', () => {
	it('builds three groups of six with one capital letter and one digit', () => {
		for (let round = 0; round < 500; round++) {
			const password = generatePassword();
			expect(password).toMatch(/^[a-zA-Z2-9]{6}-[a-zA-Z2-9]{6}-[a-zA-Z2-9]{6}$/);
			expect(password.match(/[A-Z]/g)).toHaveLength(1);
			expect(password.match(/[0-9]/g)).toHaveLength(1);
			expect(password).toMatch(/(^|-)[2-9]|[2-9](-|$)/);
			expect(password).not.toMatch(/[lLoO01]/);
		}
	});

	it('does not repeat', () => {
		const passwords = new Set(Array.from({ length: 1000 }, generatePassword));
		expect(passwords.size).toBe(1000);
	});
});
