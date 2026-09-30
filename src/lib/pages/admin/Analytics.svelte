<script lang="ts">
	import AnalyticsReport from '../../admin/analytics/AnalyticsReport.svelte';
	import { ANALYTICS_PERIODS } from '../../admin/analytics/periods';
	import type { load } from '../../routes/admin/analytics';

	let { data }: { data: Awaited<ReturnType<typeof load>> } = $props();
</script>

<AnalyticsReport
	report={data.analytics}
	enabled={data.analyticsEnabled}
	periods={ANALYTICS_PERIODS}
/>
