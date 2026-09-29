import type { ServerLoadEvent } from '@sveltejs/kit';
import { mail, type MailSubmission } from '../../server/mail';
import { serverConfig } from '../../server/runtime';

const STATUS = ['all', 'sent', 'failed', 'spam'] as const;

export async function load({ url }: ServerLoadEvent) {
	const template = url.searchParams.get('template') ?? undefined;
	const rawStatus = url.searchParams.get('status') ?? 'all';
	const status = (STATUS as readonly string[]).includes(rawStatus)
		? (rawStatus as MailSubmission['status'] | 'all')
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
		templates: Object.values(mail.templates).map((t) => ({ name: t.name, label: t.label })),
		transport: serverConfig().mail.transport,
		breadcrumbs: [{ label: 'Übersicht', href: '/admin' }, { label: 'Einsendungen' }]
	};
}
