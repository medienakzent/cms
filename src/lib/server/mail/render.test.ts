import { describe, expect, it } from 'vitest';
import { field } from '../../fields';
import { renderTemplate, toText } from './render';

const fields = {
	name: field.text({ label: 'Name' }),
	email: field.text(),
	message: field.textarea({ label: 'Nachricht' }),
	newsletter: field.boolean({ label: 'Newsletter' })
};

describe('renderTemplate', () => {
	it('ersetzt Platzhalter und neutralisiert Markup in Eingaben', () => {
		const output = renderTemplate(
			'Hallo {{name}} — {{meta.lang}}',
			fields,
			{ name: '<b>Max</b> *Muster*' },
			{ lang: 'de' }
		);
		expect(output).toBe('Hallo &lt;b&gt;Max&lt;/b&gt; \\*Muster\\* — de');
	});
	it('listet mit {{all}} alle Felder inklusive Booleans', () => {
		const output = renderTemplate('{{all}}', fields, {
			name: 'Max',
			email: 'm@x.de',
			message: 'Zeile 1\nZeile 2',
			newsletter: true
		});
		expect(output).toContain('**Name:** Max');
		expect(output).toContain('**Nachricht**\n\nZeile 1  \nZeile 2');
		expect(output).toContain('**Newsletter:** Ja');
		expect(toText(output)).toContain('Name: Max');
	});
});
