import { buildServerConfig } from './env';
let runtime = null;
export function initRuntime(registry, env) {
    runtime = {
        registry,
        config: registry.config,
        server: buildServerConfig(env),
        languages: registry.config.languages.map((language) => language.code)
    };
    return runtime;
}
export function getRuntime() {
    if (!runtime) {
        throw new Error('CMS-Laufzeit nicht initialisiert: createHandle(registry, { env }) in hooks.server.ts fehlt.');
    }
    return runtime;
}
export const serverConfig = () => getRuntime().server;
export const siteConfig = () => getRuntime().config;
