import { error, type ServerLoadEvent } from '@sveltejs/kit';
import { fieldLabel } from '../../fields';
import { mail } from '../../server/mail';

export async function load({ params }: ServerLoadEvent) {
	const sub = await mail.submission(params.id ?? '');
	if (!sub) error(404, 'Einsendung nicht gefunden');
	const def = mail.templates[sub.template];
	// Beschriftungen aus der Vorlage, damit die Detailansicht lesbar bleibt.
	const labels: Record<string, string> = def ? Object.fromEntries(Object.entries(def.fields).map(([k, f]) => [k, fieldLabel(k, f)])) : {};
	return {
		sub,
		labels,
		templateLabel: def?.label ?? sub.template,
		breadcrumbs: [
			{ label: 'Übersicht', href: '/admin' },
			{ label: 'Einsendungen', href: '/admin/submissions' },
			{ label: sub.subject || sub.id }
		]
	};
}
