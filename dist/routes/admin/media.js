import { media } from '../../server/media';
export async function load({ url }) {
    const searchQuery = url.searchParams.get('q') ?? '';
    return {
        media: await media.list({ q: searchQuery, limit: 200 }),
        q: searchQuery,
        breadcrumbs: [{ label: 'Übersicht', href: '/admin' }, { label: 'Medien' }]
    };
}
