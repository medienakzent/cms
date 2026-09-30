<script lang="ts">
	import type { BlockProps } from '@medienakzent/cms';
	import { Richtext } from '@medienakzent/cms/render';
	import type definition from './block';

	let { body, width }: BlockProps<typeof definition> = $props();
</script>

<section class="mx-auto px-6 py-10 {width === 'wide' ? 'max-w-6xl' : 'max-w-3xl'}">
	<Richtext source={body} />
</section>
