import type { FieldMap } from '../fields';
import type { AdminBlock } from './types';
type Props = {
    fields: FieldMap;
    value: Record<string, unknown>;
    onchange: (value: Record<string, unknown>) => void;
    /** Path prefix for error mapping (`''` at the root, otherwise ending with a dot). */
    path?: string;
    errors: Record<string, string>;
    lang: string;
    blockDefs: Record<string, AdminBlock>;
    /** Show the language scope badge (not below a localized parent field). */
    showScope?: boolean;
};
declare const FieldsForm: import("svelte").Component<Props, {}, "">;
type FieldsForm = ReturnType<typeof FieldsForm>;
export default FieldsForm;
