import type { ValidationIssue } from '../types';

export class CmsError extends Error {
	status: number;
	issues: ValidationIssue[];
	constructor(status: number, message: string, issues: ValidationIssue[] = []) {
		super(message);
		this.name = 'CmsError';
		this.status = status;
		this.issues = issues;
	}
}

export const notFound = (what: string) => new CmsError(404, `${what} nicht gefunden`);
export const conflict = (message: string) => new CmsError(409, message);
export const badRequest = (message: string) => new CmsError(400, message);
export const validation = (issues: ValidationIssue[]) =>
	new CmsError(422, 'Validierung fehlgeschlagen', issues);
