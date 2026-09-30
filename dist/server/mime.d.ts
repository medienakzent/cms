/** Central MIME table: file extension per type and the reverse lookup for serving. */
export declare const EXTENSION_BY_MIME: Record<string, string>;
export declare const MIME_BY_EXTENSION: Record<string, string>;
export declare function extensionFor(mime: string): string | undefined;
