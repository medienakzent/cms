import { getContext, setContext } from 'svelte';
import type { Registry } from './registry';

const KEY = Symbol.for('@compdata/cms');

/** Registry für Komponenten bereitstellen — im Wurzel-Layout der Website und im Admin-Layout. */
export function setCmsContext(registry: Registry): Registry {
	return setContext(KEY, registry);
}

export function getCmsContext(): Registry {
	const r = getContext<Registry | undefined>(KEY);
	if (!r) throw new Error('CMS-Registry fehlt im Kontext: setCmsContext(registry) im Layout aufrufen.');
	return r;
}
