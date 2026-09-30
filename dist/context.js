import { getContext, setContext } from 'svelte';
const KEY = Symbol.for('@medienakzent/cms');
/** Provides the registry to components; call in the site root layout and the admin layout. */
export function setCmsContext(registry) {
    return setContext(KEY, registry);
}
export function getCmsContext() {
    const registry = getContext(KEY);
    if (!registry)
        throw new Error('CMS-Registry fehlt im Kontext: setCmsContext(registry) im Layout aufrufen.');
    return registry;
}
