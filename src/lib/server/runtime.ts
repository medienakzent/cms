/**
 * Server runtime: registry + configuration, set by `createHandle` in the
 * customer project. All server modules access it through `getRuntime()`.
 */
import type { CmsConfig } from '../config';
import type { Registry } from '../registry';
import { buildServerConfig, type Env, type ServerConfig } from './env';

export interface Runtime {
	registry: Registry;
	config: CmsConfig;
	server: ServerConfig;
	languages: string[];
}

let runtime: Runtime | null = null;

export function initRuntime(registry: Registry, env: Env): Runtime {
	runtime = {
		registry,
		config: registry.config,
		server: buildServerConfig(env),
		languages: registry.config.languages.map((language) => language.code)
	};
	return runtime;
}

export function getRuntime(): Runtime {
	if (!runtime) {
		throw new Error(
			'CMS-Laufzeit nicht initialisiert: createHandle(registry, { env }) in hooks.server.ts fehlt.'
		);
	}
	return runtime;
}

export const serverConfig = () => getRuntime().server;
export const siteConfig = () => getRuntime().config;
