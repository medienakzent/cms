import type { ValidationIssue } from '../types';
export declare class ApiError extends Error {
    status: number;
    issues: ValidationIssue[];
    constructor(status: number, message: string, issues?: ValidationIssue[]);
}
/** Fetch wrapper for /api/v1; throws ApiError carrying validation issues. */
export declare function apiFetch<Result = unknown>(path: string, init?: RequestInit & {
    json?: unknown;
}): Promise<Result>;
export declare function issuesToMap(issues: ValidationIssue[]): Record<string, string>;
