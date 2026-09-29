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

/** fetch-Wrapper für /api/v1 — wirft ApiError mit Validierungsproblemen. */
export async function apiFetch<T = unknown>(
	path: string,
	init: RequestInit & { json?: unknown } = {}
): Promise<T> {
	const headers = new Headers(init.headers);
	let body = init.body;
	if (init.json !== undefined) {
		headers.set('content-type', 'application/json');
		body = JSON.stringify(init.json);
	}
	const res = await fetch(path, { ...init, headers, body });
	const data = (await res.json().catch(() => ({}))) as { error?: string; issues?: ValidationIssue[] };
	if (!res.ok) throw new ApiError(res.status, data.error ?? res.statusText, data.issues ?? []);
	return data as T;
}

export function issuesToMap(issues: ValidationIssue[]): Record<string, string> {
	const out: Record<string, string> = {};
	for (const i of issues) if (!out[i.path]) out[i.path] = i.message;
	return out;
}
