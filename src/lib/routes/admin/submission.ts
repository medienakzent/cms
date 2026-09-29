import { error, type ServerLoadEvent } from '@sveltejs/kit';
import { fieldLabel } from '../../fields';
import { mail } from '../../server/mail';

export async function load({ params }: ServerLoadEvent) {
	const submission = await mail.submission(params.id ?? '');
	if (!submission) error(404, 'Einsendung nicht gefunden');
	const template = mail.templates[submission.template];
	const labels: Record<string, string> = template
		? Object.fromEntries(
				Object.entries(template.fields).map(([key, fieldDefinition]) => [
					key,
					fieldLabel(key, fieldDefinition)
				])
			)
		: {};
	return {
		sub: submission,
		labels,
		templateLabel: template?.label ?? submission.template,
		breadcrumbs: [
			{ label: 'Übersicht', href: '/admin' },
			{ label: 'Einsendungen', href: '/admin/submissions' },
			{ label: submission.subject || submission.id }
		]
	};
}
