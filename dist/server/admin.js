import { getRuntime } from './runtime';
export function toAdminCollection(collection) {
    return {
        name: collection.name,
        label: collection.label,
        labelPlural: collection.labelPlural,
        icon: collection.icon,
        titleField: collection.titleField,
        fields: collection.fields,
        blocks: collection.blocks ? [...collection.blocks] : [],
        editorView: collection.editor?.view ?? 'form'
    };
}
export function toAdminBlock(block) {
    return {
        name: block.name,
        label: block.label,
        description: block.description,
        icon: block.icon,
        version: block.version,
        fields: block.fields
    };
}
export const adminCollections = () => Object.values(getRuntime().registry.collections).map(toAdminCollection);
export const adminBlocks = () => Object.fromEntries(Object.values(getRuntime().registry.blocks).map((block) => [block.name, toAdminBlock(block)]));
