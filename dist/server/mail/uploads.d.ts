import type { FileField } from '../../fields';
import type { FileRef, ValidationIssue } from '../../types';
export declare function safeFileName(name: string, mime: string): string;
export interface CheckedFile {
    key: string;
    name: string;
    mime: string;
    bytes: Buffer;
}
/** Checks an uploaded file against the field definition (type, signature, size). */
export declare function checkFile(key: string, field: FileField, file: File, issues: ValidationIssue[]): Promise<CheckedFile | null>;
/** Stores the files of one submission and returns the references with download URLs. */
export declare function storeFiles(files: CheckedFile[], origin: string): Promise<{
    token: string;
    refs: Record<string, FileRef>;
}>;
/** Resolves a file for download: valid token only, never outside the folder. */
export declare function resolveUpload(token: string, name: string): Promise<{
    bytes: Buffer;
    mime: string;
    name: string;
} | null>;
/** Deletes upload folders older than the retention period. */
export declare function pruneUploads(): Promise<number>;
