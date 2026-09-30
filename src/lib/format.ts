/** Shared formatting helpers for admin pages and mail rendering (German locale). */

export function formatBytes(bytes: number): string {
	const megabytes = bytes / 1048576;
	return megabytes < 0.1
		? `${Math.max(1, Math.round(bytes / 1024))} KB`
		: `${megabytes.toFixed(1).replace('.', ',')} MB`;
}

export function formatDate(iso: string): string {
	return new Date(iso).toLocaleDateString('de-DE', { dateStyle: 'medium' });
}

export function formatDateTime(iso: string, dateStyle: 'medium' | 'long' = 'medium'): string {
	return new Date(iso).toLocaleString('de-DE', { dateStyle, timeStyle: 'short' });
}

export function formatCount(count: number, singular: string, plural: string): string {
	return `${count} ${count === 1 ? singular : plural}`;
}

export function formatNumber(value: number, maximumFractionDigits = 0): string {
	return value.toLocaleString('de-DE', { maximumFractionDigits });
}

export function formatPercent(part: number, total: number): string {
	return total ? `${formatNumber((part / total) * 100)} %` : '–';
}

/** Duration as `45 s` or `3:07 min`. */
export function formatDuration(seconds: number): string {
	const total = Math.round(seconds);
	if (total < 60) return `${total} s`;
	return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')} min`;
}
