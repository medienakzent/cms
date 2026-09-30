/** Shared formatting helpers for admin pages and mail rendering (German locale). */
export function formatBytes(bytes) {
    const megabytes = bytes / 1048576;
    return megabytes < 0.1
        ? `${Math.max(1, Math.round(bytes / 1024))} KB`
        : `${megabytes.toFixed(1).replace('.', ',')} MB`;
}
export function formatDate(iso) {
    return new Date(iso).toLocaleDateString('de-DE', { dateStyle: 'medium' });
}
export function formatDateTime(iso, dateStyle = 'medium') {
    return new Date(iso).toLocaleString('de-DE', { dateStyle, timeStyle: 'short' });
}
export function formatCount(count, singular, plural) {
    return `${count} ${count === 1 ? singular : plural}`;
}
export function formatNumber(value, maximumFractionDigits = 0) {
    return value.toLocaleString('de-DE', { maximumFractionDigits });
}
export function formatPercent(part, total) {
    return total ? `${formatNumber((part / total) * 100)} %` : '–';
}
/** Duration as `45 s` or `3:07 min`. */
export function formatDuration(seconds) {
    const total = Math.round(seconds);
    if (total < 60)
        return `${total} s`;
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')} min`;
}
