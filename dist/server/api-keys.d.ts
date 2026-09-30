import type { Role } from './auth';
export interface ApiKeyInfo {
    id: string;
    name: string;
    role: Role;
    /** Visible start of the key, e.g. `cms_a1b2c3d4` */
    prefix: string;
    createdAt: string;
    createdBy: string;
    lastUsedAt: string | null;
    revokedAt: string | null;
}
export declare const apiKeys: {
    ensureSchema(): Promise<void>;
    list(): Promise<ApiKeyInfo[]>;
    /** Creates a key and returns the plaintext, this one time only. */
    create(name: string, role: Role, createdBy: string): Promise<{
        info: ApiKeyInfo;
        key: string;
    }>;
    revoke(id: string): Promise<boolean>;
    /** Verifies a bearer key; returns its info or null. Records last use, throttled to once a minute. */
    verify(key: string): Promise<ApiKeyInfo | null>;
};
