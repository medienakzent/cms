import { describe, expect, it } from 'vitest';
import { f } from '../../fields';
import { renderTemplate, toText } from './render';

const fields = { name: f.text({ label: 'Name' }), email: f.text(), message: f.textarea({ label: 'Nachricht' }), newsletter: f.boolean({ label: 'Newsletter' }) };

describe('renderTemplate', () => {
	it('ersetzt Platzhalter und neutralisiert Markup in Eingaben', () => {
		const out = renderTemplate('Hallo {{name}} — {{meta.lang}}', fields, { name: '<b>Max</b> *Muster*' }, { lang: 'de' });
		expect(out).toBe('Hallo &lt;b&gt;Max&lt;/b&gt; \\*Muster\\* — de');
	});
	it('listet mit {{all}} alle Felder inklusive Booleans', () => {
		const out = renderTemplate('{{all}}', fields, { name: 'Max', email: 'm@x.de', message: 'Zeile 1\nZeile 2', newsletter: true });
		expect(out).toContain('**Name:** Max');
		expect(out).toContain('**Nachricht**\n\nZeile 1  \nZeile 2');
		expect(out).toContain('**Newsletter:** Ja');
		expect(toText(out)).toContain('Name: Max');
	});
});
