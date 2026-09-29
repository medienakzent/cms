<script lang="ts">
	import type { FieldMap } from '../fields';
	import type { AdminBlock } from './types';
	import FieldEditor from './FieldEditor.svelte';

	type Props = {
		fields: FieldMap;
		value: Record<string, unknown>;
		onchange: (value: Record<string, unknown>) => void;
		/** Path prefix for error mapping (`''` at the root, otherwise ending with a dot). */
		path?: string;
		errors: Record<string, string>;
		lang: string;
		blockDefs: Record<string, AdminBlock>;
		/** Show the language scope badge (not below a localized parent field). */
		showScope?: boolean;
	};

	let {
		fields,
		value,
		onchange,
		path = '',
		errors,
		lang,
		blockDefs,
		showScope = true
	}: Props = $props();

	function set(key: string, fieldValue: unknown) {
		onchange({ ...value, [key]: fieldValue });
	}
</script>

<div class="grid grid-cols-1 gap-5 md:grid-cols-2">
	{#each Object.entries(fields) as [key, field] (key)}
		<div class={field.width === 'half' ? '' : 'md:col-span-2'}>
			<FieldEditor
				{field}
				name={key}
				value={value?.[key]}
				onchange={(fieldValue) => set(key, fieldValue)}
				path={`${path}${key}`}
				{errors}
				{lang}
				{blockDefs}
				{showScope}
			/>
		</div>
	{/each}
</div>
