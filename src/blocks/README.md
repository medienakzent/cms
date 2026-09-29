# Blocks — Konvention

Ein Block ist ein Ordner unter `src/blocks/<name>/` mit **genau zwei Dateien**:

```
src/blocks/hero/
  block.ts      # Definition = einzige Quelle der Wahrheit (Felder, Version, Migration)
  Hero.svelte   # Darstellung; Props werden aus block.ts abgeleitet
```

Nichts muss registriert werden. Die Registry (`@compdata/cms/registry`) sammelt alle
`block.ts` ein, der Renderer alle `.svelte`-Dateien. Verstöße brechen den Start.

## Regeln

1. **Ordnername = `name`** in `defineBlock`. Nur `a-z`, `0-9`, `-`.
2. **Genau eine `.svelte`-Datei** pro Ordner. Hilfskomponenten gehören nach `src/lib/components/`.
3. **Props kommen ausschließlich aus `BlockProps<typeof def>`.** Keine eigenen Prop-Typen.
   Die Komponente erhält die Felder EINER Sprache, bereits zusammengeführt und normalisiert:
   - `text | textarea | richtext | date` → `string` (nie `undefined`)
   - `number` → `number | null`
   - `boolean` → `boolean`
   - `select` → Option `| null`, `multiselect` → Option`[]`
   - `media` → `MediaRef | null`, `link` → `Link | null`
   - `reference` → Slug `| null`, `references` → Slug`[]`
   - `list` → Array des Elementtyps, `group` → Objekt, `blocks` → `RenderBlock[]`
4. **`localized: true`** markiert übersetzbare Felder. Ein Feld ist ganz oder gar nicht
   übersetzbar. In `group` dürfen einzelne Blätter übersetzbar sein, in `list` nicht
   (dann die ganze Liste markieren).
5. **Schema ändern = `version` erhöhen** und `migrate[alteVersion]` liefern. Migrationen
   bekommen die zusammengeführten Daten einer Sprache und liefern die neue Form.
6. **Keine Datenzugriffe in Blocks.** Blocks rendern nur ihre Props. Wer Daten aus
   anderen Collections braucht, lädt sie in der Route (`+page.server.ts`) und reicht
   sie über ein `reference`-Feld + Lookup durch.
7. **Richtext** wird mit `<Richtext source={body} />` aus `@compdata/cms/render` gerendert.
8. **Bilder** über `mediaUrl(image, 'md')` aus `@compdata/cms` — Varianten: `thumb`, `md`, `lg`.

## Vorlage

```ts
// src/blocks/example/block.ts
import { defineBlock, f } from '@compdata/cms';

export default defineBlock({
	name: 'example',
	label: 'Beispiel',
	icon: 'sparkles',
	version: 1,
	fields: {
		title: f.text({ label: 'Titel', localized: true, required: true }),
		image: f.media({ label: 'Bild', accept: 'image' }),
		variant: f.select(['light', 'dark'], { label: 'Variante', default: 'light' })
	}
});
```

```svelte
<!-- src/blocks/example/Example.svelte -->
<script lang="ts">
	import type { BlockProps } from '@compdata/cms';
	import { mediaUrl } from '@compdata/cms';
	import type def from './block';

	let { title, image, variant }: BlockProps<typeof def> = $props();
</script>

<section class={variant === 'dark' ? 'bg-black text-white' : ''}>
	<h2>{title}</h2>
	{#if image}<img src={mediaUrl(image, 'md')} alt={image.alt} />{/if}
</section>
```
