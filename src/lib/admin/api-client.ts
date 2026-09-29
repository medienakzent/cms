import type { ValidationIssue } from '../types';

export class ApiError extends Error {
	status: number;
	issues: ValidationIssue[];
	constructor(status: number, message: string, issues: ValidationIssue[] = []) {
		super(message);
		this.status = status;
		this.issues = issues;
	}
}

/** Fetch wrapper for /api/v1; throws ApiError carrying validation issues. */
export async function apiFetch<Result = unknown>(
	path: string,
	init: RequestInit & { json?: unknown } = {}
): Promise<Result> {
	const headers = new Headers(init.headers);
	let body = init.body;
	if (init.json !== undefined) {
		headers.set('content-type', 'application/json');
		body = JSON.stringify(init.json);
	}
	const response = await fetch(path, { ...init, headers, body });
	const data = (await response.json().catch(() => ({}))) as {
		error?: string;
		issues?: ValidationIssue[];
	};
	if (!response.ok) {
		throw new ApiError(response.status, data.error ?? response.statusText, data.issues ?? []);
	}
	return data as Result;
}

export function issuesToMap(issues: ValidationIssue[]): Record<string, string> {
	const messagesByPath: Record<string, string> = {};
	for (const issue of issues) {
		if (!messagesByPath[issue.path]) messagesByPath[issue.path] = issue.message;
	}
	return messagesByPath;
}
