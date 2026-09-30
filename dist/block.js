import { isValidName } from './name';
export function defineBlock(options) {
    if (!isValidName(options.name)) {
        throw new Error(`Block-Name „${options.name}" ist ungültig (nur a-z, 0-9, -).`);
    }
    return {
        name: options.name,
        label: options.label ?? options.name,
        description: options.description,
        icon: options.icon,
        version: options.version ?? 1,
        fields: options.fields,
        migrate: options.migrate
    };
}
/** Migrates block data up to the current version (idempotent). */
export function migrateBlockData(definition, version, data) {
    let current = data;
    let currentVersion = version;
    while (currentVersion < definition.version) {
        const step = definition.migrate?.[currentVersion];
        // Missing migration: data and version stay as they are; validation reports it.
        if (!step)
            break;
        current = step(current);
        currentVersion += 1;
    }
    return { version: currentVersion, data: current };
}
