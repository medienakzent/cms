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
	 * Markdown editor: textarea with toolbar, shortcuts (Ctrl+B, Ctrl+I, Ctrl+K) and preview.
	 * Images come from the media picker. The value stays plain Markdown, rendered via <Richtext>.
	 */
	type Props = {
		id?: string;
		value: string;
		onchange: (value: string) => void;
		rows?: number;
		placeholder?: string;
	};

	let { id, value, onchange, rows = 10, placeholder }: Props = $props();

	let textarea = $state<HTMLTextAreaElement | null>(null);
	let preview = $state(false);
	let mediaOpen = $state(false);

	/** Replaces the range [start, end) and restores the selection. */
	async function replace(
		start: number,
		end: number,
		text: string,
		selectStart: number,
		selectEnd: number
	) {
		onchange(value.slice(0, start) + text + value.slice(end));
		await tick();
		textarea?.focus();
		textarea?.setSelectionRange(selectStart, selectEnd);
	}

	function selection() {
		const element = textarea;
		if (!element) return { start: value.length, end: value.length, text: '' };
		return {
			start: element.selectionStart,
			end: element.selectionEnd,
			text: value.slice(element.selectionStart, element.selectionEnd)
		};
	}

	/** Wraps the selection with markers; removes them if already wrapped (toggle). */
	function wrap(before: string, after = before, placeholderText = 'Text') {
		const { start, end, text } = selection();
		const outerStart = start - before.length;
		const outerEnd = end + after.length;
		if (
			outerStart >= 0 &&
			value.slice(outerStart, start) === before &&
			value.slice(end, outerEnd) === after
		) {
			void replace(outerStart, outerEnd, text, outerStart, outerStart + text.length);
			return;
		}
		if (
			text.startsWith(before) &&
			text.endsWith(after) &&
			text.length >= before.length + after.length
		) {
			const inner = text.slice(before.length, text.length - after.length);
			void replace(start, end, inner, start, start + inner.length);
			return;
		}
		const inner = text || placeholderText;
		void replace(
			start,
			end,
			before + inner + after,
			start + before.length,
			start + before.length + inner.length
		);
	}

	/** Sets or removes a line prefix on every selected line (toggle). */
	function prefixLines(prefix: string | ((lineIndex: number) => string), matcher: RegExp) {
		const { start, end } = selection();
		const lineStart = value.lastIndexOf('\n', start - 1) + 1;
		const lineEndIndex = value.indexOf('\n', end);
		const lineEnd = lineEndIndex === -1 ? value.length : lineEndIndex;
		const lines = value.slice(lineStart, lineEnd).split('\n');
		const allPrefixed = lines.every((line) => matcher.test(line));
		const next = lines.map((line, lineIndex) =>
			allPrefixed
				? line.replace(matcher, '')
				: (typeof prefix === 'function' ? prefix(lineIndex) : prefix) + line.replace(matcher, '')
		);
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
		const markdown = `[${label}](${url})`;
		void replace(start, end, markdown, start + 1, start + 1 + label.length);
	}

	function image(mediaRef: MediaRef) {
		const { start, end } = selection();
		const markdown = `![${mediaRef.alt || ''}](${mediaUrl(mediaRef, 'md')})`;
		void replace(start, end, markdown, start + markdown.length, start + markdown.length);
	}

	function horizontalRule() {
		const { start, end } = selection();
		const leadingNewline = start > 0 && value[start - 1] !== '\n' ? '\n' : '';
		const markdown = `${leadingNewline}\n---\n\n`;
		void replace(start, end, markdown, start + markdown.length, start + markdown.length);
	}

	function onkeydown(event: KeyboardEvent) {
		if (!(event.ctrlKey || event.metaKey)) return;
		const key = event.key.toLowerCase();
		if (key === 'b') wrap('**');
		else if (key === 'i') wrap('_');
		else if (key === 'k') link();
		else return;
		event.preventDefault();
	}

	type Tool = { icon: typeof BoldIcon; label: string; run: () => void } | 'separator';
	const tools: Tool[] = [
		{ icon: BoldIcon, label: 'Fett (Strg+B)', run: () => wrap('**') },
		{ icon: ItalicIcon, label: 'Kursiv (Strg+I)', run: () => wrap('_') },
		'separator',
		{ icon: Heading2Icon, label: 'Überschrift 2', run: () => heading(2) },
		{ icon: Heading3Icon, label: 'Überschrift 3', run: () => heading(3) },
		'separator',
		{ icon: ListIcon, label: 'Aufzählung', run: () => prefixLines('- ', /^[-*] /) },
		{
			icon: ListOrderedIcon,
			label: 'Nummerierung',
			run: () => prefixLines((lineIndex) => `${lineIndex + 1}. `, /^\d+\. /)
		},
		{ icon: QuoteIcon, label: 'Zitat', run: () => prefixLines('> ', /^> /) },
		'separator',
		{ icon: LinkIcon, label: 'Link (Strg+K)', run: link },
		{ icon: ImageIcon, label: 'Bild aus Medien', run: () => (mediaOpen = true) },
		{ icon: CodeIcon, label: 'Code', run: () => wrap('`', '`', 'code') },
		{ icon: MinusIcon, label: 'Trennlinie', run: horizontalRule }
	];
</script>

<div class="border-border focus-within:border-ring rounded-md border">
	<div
		class="border-border bg-muted/40 flex flex-wrap items-center gap-0.5 border-b px-1.5 py-1"
		role="toolbar"
		aria-label="Formatierung"
	>
		{#each tools as tool, index (index)}
			{#if tool === 'separator'}
				<span class="bg-border mx-1 h-5 w-px" aria-hidden="true"></span>
			{:else}
				<Button
					size="icon-sm"
					variant="ghost"
					title={tool.label}
					aria-label={tool.label}
					disabled={preview}
					onclick={tool.run}
					onmousedown={(event) => event.preventDefault()}
				>
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
			oninput={(event) => onchange(event.currentTarget.value)}
			{onkeydown}
			spellcheck="true"
			class="placeholder:text-muted-foreground block w-full resize-y bg-transparent px-3 py-2 font-mono text-base leading-relaxed outline-none sm:text-sm"
		></textarea>
	{/if}
</div>

<MediaPicker bind:open={mediaOpen} accept="image" onselect={image} />
