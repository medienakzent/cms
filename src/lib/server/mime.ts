/** Central MIME table: file extension per type and the reverse lookup for serving. */

export const EXTENSION_BY_MIME: Record<string, string> = {
	'image/jpeg': '.jpg',
	'image/png': '.png',
	'image/webp': '.webp',
	'image/gif': '.gif',
	'image/avif': '.avif',
	'image/svg+xml': '.svg',
	'video/mp4': '.mp4',
	'video/webm': '.webm',
	'application/pdf': '.pdf'
};

export const MIME_BY_EXTENSION: Record<string, string> = {
	jpeg: 'image/jpeg',
	...Object.fromEntries(
		Object.entries(EXTENSION_BY_MIME).map(([mime, extension]) => [extension.slice(1), mime])
	)
};

export function extensionFor(mime: string): string | undefined {
	return EXTENSION_BY_MIME[mime];
}
