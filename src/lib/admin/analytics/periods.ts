export const ANALYTICS_PERIODS = [1, 7, 30, 90, 365] as const;

/** Selected period in days from `?days=`, 30 by default. */
export function periodOf(url: URL): number {
	const days = Number(url.searchParams.get('days'));
	return (ANALYTICS_PERIODS as readonly number[]).includes(days) ? days : 30;
}
