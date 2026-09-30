import type { Field } from '../fields';
import type { AdminBlock } from './types';
import FieldEditor from './FieldEditor.svelte';
type Props = {
    field: Field;
    name: string;
    value: unknown;
    onchange: (value: unknown) => void;
    path: string;
    errors: Record<string, string>;
    lang: string;
    blockDefs: Record<string, AdminBlock>;
    showScope?: boolean;
};
declare const FieldEditor: import("svelte").Component<Props, {}, "">;
type FieldEditor = ReturnType<typeof FieldEditor>;
export default FieldEditor;
