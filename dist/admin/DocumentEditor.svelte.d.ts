import type { Document, VersionInfo } from '../types';
import type { LanguageConfig } from '../config';
import type { AdminBlock, AdminCollection } from './types';
type Props = {
    collection: AdminCollection;
    blockDefs: Record<string, AdminBlock>;
    doc: Document;
    /** Whether this language version already exists in storage. */
    exists: boolean;
    lang: string;
    languages: LanguageConfig[];
    versions: VersionInfo[];
    previewHref: string | null;
};
declare const DocumentEditor: import("svelte").Component<Props, {}, "">;
type DocumentEditor = ReturnType<typeof DocumentEditor>;
export default DocumentEditor;
