<script lang="ts">
	import type { FieldMap } from '../fields';
	import type { AdminBlock } from './types';
	import FieldEditor from './FieldEditor.svelte';

	type Props = {
		fields: FieldMap;
		value: Record<string, unknown>;
		onchange: (v: Record<string, unknown>) => void;
		/** Pfad-Präfix für Fehlerzuordnung (`''` an der Wurzel, sonst mit Punkt am Ende). */
		path?: string;
		errors: Record<string, string>;
		lang: string;
		blockDefs: Record<string, AdminBlock>;
		/** Sprach-Kennzeichen anzeigen (unterhalb eines lokalisierten Elternfelds nicht). */
		showScope?: boolean;
	};

	let { fields, value, onchange, path = '', errors, lang, blockDefs, showScope = true }: Props = $props();

	function set(key: string, v: unknown) {
		onchange({ ...value, [key]: v });
	}
</script>

<div class="grid grid-cols-1 gap-5 md:grid-cols-2">
	{#each Object.entries(fields) as [key, field] (key)}
		<div class={field.width === 'half' ? '' : 'md:col-span-2'}>
			<FieldEditor
				{field}
				name={key}
				value={value?.[key]}
				onchange={(v) => set(key, v)}
				path={`${path}${key}`}
				{errors}
				{lang}
				{blockDefs}
				{showScope}
			/>
		</div>
	{/each}
</div>
