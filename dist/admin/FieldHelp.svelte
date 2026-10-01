<script lang="ts">
	import { Popover as PopoverPrimitive } from 'bits-ui';
	import { Popover, PopoverContent } from '@compdata/ui/popover';
	import InfoIcon from '@lucide/svelte/icons/info';

	/** Help text of a field behind an info icon next to its label, so forms stay compact. */
	let { text, label }: { text: string; label: string } = $props();
</script>

<Popover>
	<PopoverPrimitive.Trigger
		type="button"
		class="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex size-5 shrink-0 items-center justify-center rounded-full focus-visible:ring-2 focus-visible:outline-none"
		aria-label="Hinweis zu „{label}“"
	>
		<InfoIcon class="size-3.5" aria-hidden="true" />
	</PopoverPrimitive.Trigger>
	<PopoverContent align="start" class="w-auto max-w-xs p-3 text-xs leading-relaxed">
		{text}
	</PopoverContent>
</Popover>
