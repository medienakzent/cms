import type { FieldMap } from './fields';
import type { InferFields } from './types';

export type Migration = (data: Record<string, unknown>) => Record<string, unknown>;

export interface BlockDefinition<F extends FieldMap = FieldMap> {
	/** Muss dem Ordnernamen unter `src/blocks/` entsprechen. */
	name: string;
	label: string;
	description?: string;
	/** Name eines Lucide-Icons (z. B. `image`, `text`) für den Admin. */
	icon?: string;
	/** Schema-Version. Erhöhen, wenn sich `fields` inkompatibel ändert; dazu `migrate[alteVersion]` liefern. */
	version: number;
	fields: F;
	/**
	 * Migrationen von Version n → n+1. Schlüssel = Ausgangsversion.
	 * Bekommt die zusammengeführten Daten EINER Sprache und liefert die neue Form.
	 */
	migrate?: Record<number, Migration>;
}

export interface BlockOptions<F extends FieldMap> {
	name: string;
	label?: string;
	description?: string;
	icon?: string;
	version?: number;
	fields: F;
	migrate?: Record<number, Migration>;
}

export function defineBlock<const F extends FieldMap>(def: BlockOptions<F>): BlockDefinition<F> {
	if (!/^[a-z][a-z0-9-]*$/.test(def.name)) {
		throw new Error(`Block-Name „${def.name}" ist ungültig (nur a-z, 0-9, -).`);
	}
	return {
		name: def.name,
		label: def.label ?? def.name,
		description: def.description,
		icon: def.icon,
		version: def.version ?? 1,
		fields: def.fields,
		migrate: def.migrate
	};
}

/**
 * Props der Svelte-Komponente eines Blocks:
 *
 *   let { title, image }: BlockProps<typeof def> = $props();
 */
export type BlockProps<D> = D extends BlockDefinition<infer F> ? InferFields<F> : never;

/** Migration auf die aktuelle Version anwenden (idempotent). */
export function migrateBlockData(
	def: BlockDefinition,
	version: number,
	data: Record<string, unknown>
): { version: number; data: Record<string, unknown> } {
	let current = data;
	let v = version;
	while (v < def.version) {
		const step = def.migrate?.[v];
		if (!step) break; // keine Migration: Daten unverändert, Version bleibt — Validierung meldet Fehler
		current = step(current);
		v += 1;
	}
	return { version: v, data: current };
}
