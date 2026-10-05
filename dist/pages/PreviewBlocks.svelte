<script lang="ts">
	import { tick } from 'svelte';
	import { getCmsContext } from '../context';
	import type { MediaRef, RenderBlock } from '../types';
	import { PREVIEW_EVENT, type PreviewEvent } from '../preview';

	/**
	 * Block list of the preview frame with direct editing. Customer blocks need no changes: text
	 * and textarea fields are found by their rendered text, media fields by their file URL. Those
	 * elements become editable (typing) or clickable (media picker); a click elsewhere selects the
	 * block, whose full form the editor then opens. The editor's state stays the only truth.
	 */
	type Props = {
		blocks: RenderBlock[];
		selectedBlockId: string | null;
		/** True while an element is being typed into; the frame then holds back incoming state. */
		editing: boolean;
	};

	let { blocks, selectedBlockId, editing = $bindable(false) }: Props = $props();

	// svelte-ignore state_referenced_locally
	const registry = getCmsContext();
	let container = $state<HTMLElement | null>(null);
	/** Rebuilds a block after typing, because contenteditable may have replaced Svelte's text nodes. */
	let revisions = $state<Record<string, number>>({});
	let hoveredBlockId = $state<string | null>(null);
	let outline = $state<{ top: number; left: number; width: number; height: number } | null>(null);
	let selectionOutline = $state<{
		top: number;
		left: number;
		width: number;
		height: number;
	} | null>(null);

	const activeBlockId = $derived(hoveredBlockId ?? selectedBlockId);
	const activeIndex = $derived(blocks.findIndex((block) => block.id === activeBlockId));
	const activeLabel = $derived.by(() => {
		const block = blocks[activeIndex];
		return block ? (registry.blocks[block.type]?.label ?? block.type) : '';
	});

	/** Event without its `type`, per union member. */
	type PreviewEventBody = PreviewEvent extends infer Event
		? Event extends PreviewEvent
			? Omit<Event, 'type'>
			: never
		: never;

	function send(event: PreviewEventBody) {
		window.parent?.postMessage({ type: PREVIEW_EVENT, ...event }, window.location.origin);
	}

	const normalize = (text: string) => text.replace(/\s+/g, ' ').trim();

	function blockElement(blockId: string): HTMLElement | null {
		return container?.querySelector(`[data-cms-block="${CSS.escape(blockId)}"]`) ?? null;
	}

	/** Union of the rendered boxes of a block (its wrapper uses display: contents). */
	function blockRect(blockId: string) {
		const wrapper = blockElement(blockId);
		if (!wrapper) return null;
		const rects = [...wrapper.children]
			.map((child) => child.getBoundingClientRect())
			.filter((rect) => rect.width > 0 || rect.height > 0);
		if (!rects.length) return null;
		const top = Math.min(...rects.map((rect) => rect.top));
		const left = Math.min(...rects.map((rect) => rect.left));
		const bottom = Math.max(...rects.map((rect) => rect.bottom));
		const right = Math.max(...rects.map((rect) => rect.right));
		return { top, left, width: right - left, height: bottom - top };
	}

	function measure() {
		outline = hoveredBlockId ? blockRect(hoveredBlockId) : null;
		selectionOutline = selectedBlockId ? blockRect(selectedBlockId) : null;
	}

	/** Deepest element below `root` whose text equals `value`. */
	function findText(root: Element, value: string, used: Set<Element>): HTMLElement | null {
		const target = normalize(value);
		if (!target) return null;
		const matches = [...root.querySelectorAll<HTMLElement>('*')].filter(
			(element) =>
				!used.has(element) &&
				!['SCRIPT', 'STYLE', 'svg'].includes(element.tagName) &&
				normalize(element.textContent ?? '') === target
		);
		return (
			matches.find(
				(element) => !matches.some((other) => other !== element && element.contains(other))
			) ?? null
		);
	}

	function markEditable() {
		if (!container) return;
		for (const element of container.querySelectorAll('[data-cms-field], [data-cms-media]')) {
			if (element === document.activeElement) continue;
			element.removeAttribute('data-cms-field');
			element.removeAttribute('data-cms-media');
			element.removeAttribute('contenteditable');
		}
		for (const block of blocks) {
			const wrapper = blockElement(block.id);
			const definition = registry.blocks[block.type];
			if (!wrapper || !definition) continue;
			const used = new Set<Element>();
			for (const [name, field] of Object.entries(definition.fields)) {
				const value = block.data[name];
				if ((field.kind === 'text' || field.kind === 'textarea') && typeof value === 'string') {
					const element = findText(wrapper, value, used);
					if (!element) continue;
					used.add(element);
					element.dataset.cmsField = name;
					element.dataset.cmsKind = field.kind;
					element.setAttribute('contenteditable', 'plaintext-only');
					element.setAttribute('spellcheck', 'true');
				} else if (field.kind === 'media' && value && typeof value === 'object') {
					const media = value as MediaRef;
					for (const image of wrapper.querySelectorAll<HTMLImageElement>('img')) {
						const source = `${image.getAttribute('src') ?? ''} ${image.getAttribute('srcset') ?? ''}`;
						if (media.id && source.includes(media.id)) image.dataset.cmsMedia = name;
					}
				}
			}
		}
	}

	$effect(() => {
		// Re-mark after every render of the block list.
		void blocks;
		void revisions;
		tick().then(() => {
			markEditable();
			measure();
		});
	});
	$effect(() => {
		void selectedBlockId;
		tick().then(measure);
	});

	function blockIdOf(target: EventTarget | null): string | null {
		return (
			(target as Element | null)?.closest?.('[data-cms-block]')?.getAttribute('data-cms-block') ??
			null
		);
	}

	function onClick(event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (target.closest('[data-cms-toolbar]')) return;
		const blockId = blockIdOf(target);
		if (!blockId) return;
		// Links and buttons inside blocks must not navigate the frame or submit forms.
		if (target.closest('a, button, form')) event.preventDefault();
		const media = target.closest<HTMLElement>('[data-cms-media]');
		if (media) {
			send({ action: 'media', blockId, field: media.dataset.cmsMedia! });
			return;
		}
		// A click on an editable text starts typing; only clicks elsewhere open the block's form.
		if (target.closest('[data-cms-field]')) return;
		send({ action: 'select', blockId });
	}

	function onInput(event: Event) {
		const element = (event.target as HTMLElement).closest<HTMLElement>('[data-cms-field]');
		const blockId = blockIdOf(element);
		if (!element || !blockId) return;
		const value =
			element.dataset.cmsKind === 'textarea'
				? element.innerText.replace(/\n$/, '')
				: (element.textContent ?? '').replace(/\s*\n\s*/g, ' ');
		send({ action: 'input', blockId, field: element.dataset.cmsField!, value });
	}

	function onFocusIn(event: FocusEvent) {
		if ((event.target as HTMLElement).closest('[data-cms-field]')) editing = true;
	}

	function onFocusOut(event: FocusEvent) {
		const element = (event.target as HTMLElement).closest<HTMLElement>('[data-cms-field]');
		if (!element) return;
		const blockId = blockIdOf(element);
		editing = false;
		if (blockId) revisions = { ...revisions, [blockId]: (revisions[blockId] ?? 0) + 1 };
	}

	function onKeyDown(event: KeyboardEvent) {
		const element = (event.target as HTMLElement).closest<HTMLElement>('[data-cms-field]');
		if (!element) return;
		// Single-line fields end with Enter; Escape leaves any field.
		if ((event.key === 'Enter' && element.dataset.cmsKind === 'text') || event.key === 'Escape') {
			event.preventDefault();
			element.blur();
		}
	}

	function onPointerOver(event: PointerEvent) {
		// The toolbar sits outside the block wrapper; hovering it keeps the block active.
		if ((event.target as Element | null)?.closest?.('[data-cms-toolbar]')) return;
		const blockId = blockIdOf(event.target);
		if (blockId !== hoveredBlockId) {
			hoveredBlockId = blockId;
			measure();
		}
	}
</script>

<svelte:window onscroll={measure} onresize={measure} />

<div
	bind:this={container}
	data-cms-edit
	role="presentation"
	onclick={onClick}
	oninput={onInput}
	onfocusin={onFocusIn}
	onfocusout={onFocusOut}
	onkeydown={onKeyDown}
	onpointerover={onPointerOver}
	onsubmit={(event) => event.preventDefault()}
	onpointerleave={() => {
		hoveredBlockId = null;
		measure();
	}}
	style="display: contents"
>
	{#each blocks as block (block.id)}
		{@const Component = registry.components[block.type]}
		<div data-cms-block={block.id} style="display: contents">
			{#key revisions[block.id] ?? 0}
				{#if Component}
					<Component {...block.data} />
				{:else}
					<div class="cms-unknown">Unbekannter Block „{block.type}"</div>
				{/if}
			{/key}
		</div>
	{/each}

	{#if selectionOutline && selectedBlockId !== hoveredBlockId}
		<div
			class="cms-outline cms-outline--selected"
			style="top: {selectionOutline.top}px; left: {selectionOutline.left}px; width: {selectionOutline.width}px; height: {selectionOutline.height}px"
		></div>
	{/if}
	{#if outline && activeIndex >= 0}
		<div
			class="cms-outline"
			style="top: {outline.top}px; left: {outline.left}px; width: {outline.width}px; height: {outline.height}px"
		></div>
		<div
			class="cms-toolbar"
			data-cms-toolbar
			style="top: {Math.max(outline.top, 0)}px; left: {outline.left}px; width: {outline.width}px"
		>
			<button
				type="button"
				class="cms-toolbar__label"
				title="Alle Felder bearbeiten"
				onclick={() => send({ action: 'select', blockId: blocks[activeIndex].id })}
				>{activeLabel}</button
			>
			<span class="cms-toolbar__actions">
				<button
					type="button"
					title="Bearbeiten"
					onclick={() => send({ action: 'select', blockId: blocks[activeIndex].id })}>✎</button
				>
				<button
					type="button"
					title="Nach oben"
					disabled={activeIndex === 0}
					onclick={() => send({ action: 'move-up', blockId: blocks[activeIndex].id })}>↑</button
				>
				<button
					type="button"
					title="Nach unten"
					disabled={activeIndex === blocks.length - 1}
					onclick={() => send({ action: 'move-down', blockId: blocks[activeIndex].id })}>↓</button
				>
				<button
					type="button"
					title="Duplizieren"
					onclick={() => send({ action: 'duplicate', blockId: blocks[activeIndex].id })}>⧉</button
				>
				<button
					type="button"
					title="Entfernen"
					class="cms-toolbar__danger"
					onclick={() => send({ action: 'remove', blockId: blocks[activeIndex].id })}>✕</button
				>
			</span>
		</div>
	{/if}
</div>

<style>
	/* Fixed colours on purpose: the frame uses the site's stylesheet, not the admin theme. */
	.cms-outline {
		position: fixed;
		z-index: 2147483000;
		pointer-events: none;
		outline: 2px solid #0891b2;
		outline-offset: -2px;
	}
	.cms-outline--selected {
		outline-style: dashed;
		outline-color: rgb(8 145 178 / 0.6);
	}
	.cms-toolbar {
		position: fixed;
		z-index: 2147483001;
		display: flex;
		justify-content: space-between;
		pointer-events: none;
		font:
			500 12px/1 system-ui,
			sans-serif;
	}
	.cms-toolbar__label,
	.cms-toolbar__actions {
		pointer-events: auto;
		background: #0891b2;
		color: #fff;
	}
	.cms-toolbar__label {
		all: unset;
		cursor: pointer;
		background: #0891b2;
		color: #fff;
		padding: 5px 8px;
		border-bottom-right-radius: 6px;
	}
	.cms-toolbar__actions {
		display: flex;
		border-bottom-left-radius: 6px;
		overflow: hidden;
	}
	.cms-toolbar__actions button {
		all: unset;
		cursor: pointer;
		padding: 5px 8px;
		font-size: 13px;
	}
	.cms-toolbar__actions button:hover {
		background: rgb(0 0 0 / 0.2);
	}
	.cms-toolbar__actions button:disabled {
		opacity: 0.4;
		cursor: default;
	}
	.cms-toolbar__danger:hover {
		background: #b91c1c !important;
	}
	.cms-unknown {
		margin: 1rem;
		padding: 1rem;
		border: 1px dashed #f87171;
		color: #dc2626;
		font-size: 14px;
	}
	:global([data-cms-edit] [data-cms-field]) {
		cursor: text;
		border-radius: 2px;
		transition: outline-color 0.1s;
		outline: 1px dashed transparent;
		outline-offset: 2px;
	}
	:global([data-cms-edit] [data-cms-field]:hover) {
		outline-color: rgb(8 145 178 / 0.7);
	}
	:global([data-cms-edit] [data-cms-field]:focus) {
		outline: 2px solid #0891b2;
	}
	:global([data-cms-edit] [data-cms-media]) {
		cursor: pointer;
	}
	:global([data-cms-edit] [data-cms-media]:hover) {
		outline: 3px solid #0891b2;
		outline-offset: -3px;
	}
</style>
