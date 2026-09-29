import { getContext, setContext } from 'svelte';
import type { Registry } from './registry';

const KEY = Symbol.for('@medienakzent/cms');

/** Provides the registry to components; call in the site root layout and the admin layout. */
export function setCmsContext(registry: Registry): Registry {
	return setContext(KEY, registry);
}

export function getCmsContext(): Registry {
	const registry = getContext<Registry | undefined>(KEY);
	if (!registry)
		throw new Error('CMS-Registry fehlt im Kontext: setCmsContext(registry) im Layout aufrufen.');
	return registry;
}
