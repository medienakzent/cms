/**
 * Once on the first request: index schema, auth tables, rebuild the index from
 * the storage if needed and create a sample document.
 */
export declare function ensureReady(): Promise<void>;
