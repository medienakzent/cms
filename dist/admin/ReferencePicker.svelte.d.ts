type Props = {
    id?: string;
    collection: string;
    lang: string;
    multiple?: boolean;
    value: string | null | string[];
    onchange: (value: string | null | string[]) => void;
};
declare const ReferencePicker: import("svelte").Component<Props, {}, "">;
type ReferencePicker = ReturnType<typeof ReferencePicker>;
export default ReferencePicker;
