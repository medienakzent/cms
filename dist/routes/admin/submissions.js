import { mail } from '../../server/mail';
import { serverConfig } from '../../server/runtime';
const STATUS = ['all', 'sent', 'failed', 'spam'];
export async function load({ url }) {
    const template = url.searchParams.get('template') ?? undefined;
    const rawStatus = url.searchParams.get('status') ?? 'all';
    const status = STATUS.includes(rawStatus)
        ? rawStatus
        : 'all';
    const page = Math.max(Number(url.searchParams.get('page') ?? 1) || 1, 1);
    const limit = 50;
    const result = await mail.submissions({ template, status, limit, offset: (page - 1) * limit });
    return {
        template: template ?? '',
        status,
        page,
        pages: Math.max(Math.ceil(result.total / limit), 1),
        total: result.total,
        items: result.items,
        templates: Object.values(mail.templates).map((mailTemplate) => ({
            name: mailTemplate.name,
            label: mailTemplate.label
        })),
        transport: serverConfig().mail.transport,
        breadcrumbs: [{ label: 'Übersicht', href: '/admin' }, { label: 'Einsendungen' }]
    };
}
