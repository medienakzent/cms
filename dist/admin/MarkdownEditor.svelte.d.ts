/**
 * Markdown editor: textarea with toolbar, shortcuts (Ctrl+B, Ctrl+I, Ctrl+K) and preview.
 * Images come from the media picker. The value stays plain Markdown, rendered via <Richtext>.
 */
type Props = {
    id?: string;
    value: string;
    onchange: (value: string) => void;
    rows?: number;
    placeholder?: string;
};
declare const MarkdownEditor: import("svelte").Component<Props, {}, "">;
type MarkdownEditor = ReturnType<typeof MarkdownEditor>;
export default MarkdownEditor;
