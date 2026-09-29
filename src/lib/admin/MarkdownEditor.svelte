<script lang="ts">
	import { tick } from 'svelte';
	import type { MediaRef } from '../types';
	import { mediaUrl } from '../media-url';
	import Richtext from '../render/Richtext.svelte';
	import MediaPicker from './MediaPicker.svelte';
	import { Button } from '@compdata/ui/button';
	import BoldIcon from '@lucide/svelte/icons/bold';
	import ItalicIcon from '@lucide/svelte/icons/italic';
	import Heading2Icon from '@lucide/svelte/icons/heading-2';
	import Heading3Icon from '@lucide/svelte/icons/heading-3';
	import ListIcon from '@lucide/svelte/icons/list';
	import ListOrderedIcon from '@lucide/svelte/icons/list-ordered';
	import QuoteIcon from '@lucide/svelte/icons/quote';
	import LinkIcon from '@lucide/svelte/icons/link';
	import ImageIcon from '@lucide/svelte/icons/image';
	import CodeIcon from '@lucide/svelte/icons/code';
	import MinusIcon from '@lucide/svelte/icons/minus';
	import EyeIcon from '@lucide/svelte/icons/eye';
	import PencilIcon from '@lucide/svelte/icons/pencil';

	/**
	 * Markdown-Editor des Projekts: Textarea mit Werkzeugleiste, Tastenkürzeln
	 * (Strg+B, Strg+I, Strg+K) und Vorschau. Bilder kommen aus der Medienauswahl.
	 * Der Wert bleibt reines Markdown — gerendert wird mit <Richtext>.
	 */
	type Props = {
		id?: string;
		value: string;
		onchange: (v: string) => void;
		rows?: number;
		placeholder?: string;
	};

	let { id, value, onchange, rows = 10, placeholder }: Props = $props();

	let textarea = $state<HTMLTextAreaElement | null>(null);
	let preview = $state(false);
	let mediaOpen = $state(false);

	/** Ersetzt den Bereich [start, end) und setzt die Auswahl neu. */
	async function replace(start: number, end: number, text: string, selectStart: number, selectEnd: number) {
		onchange(value.slice(0, start) + text + value.slice(end));
		await tick();
		textarea?.focus();
		textarea?.setSelectionRange(selectStart, selectEnd);
	}

	function selection() {
		const el = textarea;
		if (!el) return { start: value.length, end: value.length, text: '' };
		return { start: el.selectionStart, end: el.selectionEnd, text: value.slice(el.selectionStart, el.selectionEnd) };
	}

	/** Auswahl mit Markern umschließen; ist sie schon umschlossen, Marker entfernen (Toggle). */
	function wrap(before: string, after = before, placeholderText = 'Text') {
		const { start, end, text } = selection();
		const outerStart = start - before.length;
		const outerEnd = end + after.length;
		if (outerStart >= 0 && value.slice(outerStart, start) === before && value.slice(end, outerEnd) === after) {
			void replace(outerStart, outerEnd, text, outerStart, outerStart + text.length);
			return;
		}
		if (text.startsWith(before) && text.endsWith(after) && text.length >= before.length + after.length) {
			const inner = text.slice(before.length, text.length - after.length);
			void replace(start, end, inner, start, start + inner.length);
			return;
		}
		const inner = text || placeholderText;
		void replace(start, end, before + inner + after, start + before.length, start + before.length + inner.length);
	}

	/** Zeilenpräfix für alle Zeilen der Auswahl setzen oder entfernen (Toggle). */
	function prefixLines(prefix: string | ((i: number) => string), matcher: RegExp) {
		const { start, end } = selection();
		const lineStart = value.lastIndexOf('\n', start - 1) + 1;
		const lineEndIdx = value.indexOf('\n', end);
		const lineEnd = lineEndIdx === -1 ? value.length : lineEndIdx;
		const lines = value.slice(lineStart, lineEnd).split('\n');
		const allPrefixed = lines.every((l) => matcher.test(l));
		const next = lines.map((l, i) => (allPrefixed ? l.replace(matcher, '') : (typeof prefix === 'function' ? prefix(i) : prefix) + l.replace(matcher, '')));
		const text = next.join('\n');
		void replace(lineStart, lineEnd, text, lineStart, lineStart + text.length);
	}

	function heading(level: 2 | 3) {
		prefixLines('#'.repeat(level) + ' ', new RegExp(`^#{${level}} `));
	}

	function link() {
		const { start, end, text } = selection();
		const url = window.prompt('Link-Ziel (URL oder /pfad):', 'https://');
		if (!url) return;
		const label = text || 'Linktext';
		const out = `[${label}](${url})`;
		void replace(start, end, out, start + 1, start + 1 + label.length);
	}

	function image(ref: MediaRef) {
		const { start, end } = selection();
		const out = `![${ref.alt || ''}](${mediaUrl(ref, 'md')})`;
		void replace(start, end, out, start + out.length, start + out.length);
	}

	function hr() {
		const { start, end } = selection();
		const pre = start > 0 && value[start - 1] !== '\n' ? '\n' : '';
		const out = `${pre}\n---\n\n`;
		void replace(start, end, out, start + out.length, start + out.length);
	}

	function onkeydown(e: KeyboardEvent) {
		if (!(e.ctrlKey || e.metaKey)) return;
		const key = e.key.toLowerCase();
		if (key === 'b') wrap('**');
		else if (key === 'i') wrap('_');
		else if (key === 'k') link();
		else return;
		e.preventDefault();
	}

	type Tool = { icon: typeof BoldIcon; label: string; run: () => void } | 'sep';
	const tools: Tool[] = [
		{ icon: BoldIcon, label: 'Fett (Strg+B)', run: () => wrap('**') },
		{ icon: ItalicIcon, label: 'Kursiv (Strg+I)', run: () => wrap('_') },
		'sep',
		{ icon: Heading2Icon, label: 'Überschrift 2', run: () => heading(2) },
		{ icon: Heading3Icon, label: 'Überschrift 3', run: () => heading(3) },
		'sep',
		{ icon: ListIcon, label: 'Aufzählung', run: () => prefixLines('- ', /^[-*] /) },
		{ icon: ListOrderedIcon, label: 'Nummerierung', run: () => prefixLines((i) => `${i + 1}. `, /^\d+\. /) },
		{ icon: QuoteIcon, label: 'Zitat', run: () => prefixLines('> ', /^> /) },
		'sep',
		{ icon: LinkIcon, label: 'Link (Strg+K)', run: link },
		{ icon: ImageIcon, label: 'Bild aus Medien', run: () => (mediaOpen = true) },
		{ icon: CodeIcon, label: 'Code', run: () => wrap('`', '`', 'code') },
		{ icon: MinusIcon, label: 'Trennlinie', run: hr }
	];
</script>

<div class="border-border focus-within:border-ring rounded-md border">
	<div class="border-border bg-muted/40 flex flex-wrap items-center gap-0.5 border-b px-1.5 py-1" role="toolbar" aria-label="Formatierung">
		{#each tools as tool, i (i)}
			{#if tool === 'sep'}
				<span class="bg-border mx-1 h-5 w-px" aria-hidden="true"></span>
			{:else}
				<Button size="icon-sm" variant="ghost" title={tool.label} aria-label={tool.label} disabled={preview} onclick={tool.run} onmousedown={(e) => e.preventDefault()}>
					<tool.icon aria-hidden="true" />
				</Button>
			{/if}
		{/each}
		<span class="flex-1"></span>
		<Button size="sm" variant="ghost" onclick={() => (preview = !preview)}>
			{#if preview}<PencilIcon aria-hidden="true" /> Bearbeiten{:else}<EyeIcon aria-hidden="true" /> Vorschau{/if}
		</Button>
	</div>
	{#if preview}
		<div class="min-h-24 p-3"><Richtext source={value} /></div>
	{:else}
		<textarea
			bind:this={textarea}
			{id}
			{rows}
			{placeholder}
			{value}
			oninput={(e) => onchange(e.currentTarget.value)}
			{onkeydown}
			spellcheck="true"
			class="placeholder:text-muted-foreground block w-full resize-y bg-transparent px-3 py-2 font-mono text-sm leading-relaxed outline-none"
		></textarea>
	{/if}
</div>

<MediaPicker bind:open={mediaOpen} accept="image" onselect={image} />
