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
export const conflict = (msg: string) => new CmsError(409, msg);
export const badRequest = (msg: string) => new CmsError(400, msg);
export const validation = (issues: ValidationIssue[]) =>
	new CmsError(422, 'Validierung fehlgeschlagen', issues);
