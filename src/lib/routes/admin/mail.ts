import type { ServerLoadEvent } from '@sveltejs/kit';
import { mail } from '../../server/mail';
import { serverConfig } from '../../server/runtime';

export async function load({ url }: ServerLoadEvent) {
	const template = url.searchParams.get('template') ?? undefined;
	return {
		template,
		templates: Object.values(mail.templates).map((t) => ({ name: t.name, label: t.label })),
		submissions: await mail.submissions({ template, limit: 200 }),
		transport: serverConfig().mail.transport,
		breadcrumbs: [{ label: 'Übersicht', href: '/admin' }, { label: 'Anfragen' }]
	};
}
