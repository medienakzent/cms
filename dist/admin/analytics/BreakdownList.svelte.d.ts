type Row = {
    label: string;
    count: number;
    href?: string;
};
type Props = {
    title: string;
    rows: Row[];
    /** Reference for the share; the sum of all rows by default. */
    total?: number;
    empty?: string;
    format?: (label: string) => string;
};
declare const BreakdownList: import("svelte").Component<Props, {}, "">;
type BreakdownList = ReturnType<typeof BreakdownList>;
export default BreakdownList;
