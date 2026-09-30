export const ANALYTICS_PERIODS = [1, 7, 30, 90, 365];
/** Selected period in days from `?days=`, 30 by default. */
export function periodOf(url) {
    const days = Number(url.searchParams.get('days'));
    return ANALYTICS_PERIODS.includes(days) ? days : 30;
}
