type Bar = {
    label: string;
    value: number;
    secondary?: number;
    title: string;
};
type Props = {
    bars: Bar[];
    /** Labels below the chart, e.g. first, middle and last day. */
    axis: string[];
    height?: string;
};
declare const BarChart: import("svelte").Component<Props, {}, "">;
type BarChart = ReturnType<typeof BarChart>;
export default BarChart;
