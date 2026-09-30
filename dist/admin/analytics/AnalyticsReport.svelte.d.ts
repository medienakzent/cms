import type { AnalyticsReport } from '../../server/analytics';
type Props = {
    report: AnalyticsReport;
    enabled: boolean;
    periods: readonly number[];
};
declare const AnalyticsReport: import("svelte").Component<Props, {}, "">;
type AnalyticsReport = ReturnType<typeof AnalyticsReport>;
export default AnalyticsReport;
