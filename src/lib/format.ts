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
