import type { ValidationIssue } from '../types';
export declare class CmsError extends Error {
    status: number;
    issues: ValidationIssue[];
    constructor(status: number, message: string, issues?: ValidationIssue[]);
}
export declare const notFound: (what: string) => CmsError;
export declare const conflict: (message: string) => CmsError;
export declare const badRequest: (message: string) => CmsError;
export declare const validation: (issues: ValidationIssue[]) => CmsError;
