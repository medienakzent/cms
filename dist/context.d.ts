import type { Registry } from './registry';
/** Provides the registry to components; call in the site root layout and the admin layout. */
export declare function setCmsContext(registry: Registry): Registry;
export declare function getCmsContext(): Registry;
