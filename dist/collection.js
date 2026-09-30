import { isValidName } from './name';
export function defineCollection(options) {
    if (!isValidName(options.name)) {
        throw new Error(`Collection-Name „${options.name}" ist ungültig (nur a-z, 0-9, -).`);
    }
    const titleField = (options.titleField ?? 'title');
    const titleFieldDefinition = options.fields[titleField];
    if (!titleFieldDefinition || titleFieldDefinition.kind !== 'text') {
        throw new Error(`Collection „${options.name}": titleField „${titleField}" fehlt oder ist kein Textfeld.`);
    }
    return {
        name: options.name,
        label: options.label ?? options.name,
        labelPlural: options.labelPlural ?? options.label ?? options.name,
        description: options.description,
        icon: options.icon,
        version: options.version ?? 1,
        fields: options.fields,
        blocks: options.blocks ?? false,
        titleField,
        excerptField: options.excerptField,
        sortBy: options.sortBy ?? { field: 'updatedAt', direction: 'desc' },
        path: options.path ?? (() => null),
        migrate: options.migrate
    };
}
export function defineContent(options) {
    return { collections: options.collections ?? [] };
}
