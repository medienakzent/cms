import { building } from '$app/environment';
import { env } from '$env/dynamic/private';
import { createHandle } from '@medienakzent/cms/server';
import registry from './cms';

export const handle = createHandle(registry, { env, building });
