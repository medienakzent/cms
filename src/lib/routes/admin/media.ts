import type { ServerLoadEvent } from '@sveltejs/kit';
import { media } from '../../server/media';

export async function load({ url }: ServerLoadEvent) {
	const q = url.searchParams.get('q') ?? '';
	return { media: await media.list({ q, limit: 200 }), q, breadcrumbs: [{ label: 'Übersicht', href: '/admin' }, { label: 'Medien' }] };
}
