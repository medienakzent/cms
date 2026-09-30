const folderOf = (path) => path.split('/').at(-2) ?? '';
const fileOf = (path) => (path.split('/').at(-1) ?? '').replace(/\.(ts|js|svelte)$/, '');
function checkReferences(owner, fields, registry) {
    for (const [key, field] of Object.entries(fields)) {
        if ((field.kind === 'reference' || field.kind === 'references') &&
            !registry.collections[field.collection]) {
            throw new Error(`${owner}.${key}: verweist auf unbekannte Collection „${field.collection}".`);
        }
        if (field.kind === 'blocks') {
            for (const blockName of field.allow ?? [])
                if (!registry.blocks[blockName])
                    throw new Error(`${owner}.${key}: unbekannter Block „${blockName}".`);
        }
        if (field.kind === 'group')
            checkReferences(`${owner}.${key}`, field.fields, registry);
        if (field.kind === 'list')
            checkReferences(`${owner}.${key}[]`, { item: field.of }, registry);
    }
}
export function defineRegistry(input) {
    const registry = {
        config: input.config,
        blocks: {},
        components: {},
        collections: {},
        mail: {},
        previews: {}
    };
    for (const [path, moduleExport] of Object.entries(input.blocks)) {
        const definition = moduleExport;
        if (!definition || typeof definition !== 'object' || !definition.name)
            throw new Error(`${path}: default export muss defineBlock(...) sein.`);
        if (definition.name !== folderOf(path))
            throw new Error(`${path}: Block-Name „${definition.name}" muss dem Ordnernamen „${folderOf(path)}" entsprechen.`);
        registry.blocks[definition.name] = definition;
    }
    for (const [path, component] of Object.entries(input.components)) {
        const folder = folderOf(path);
        if (registry.components[folder])
            throw new Error(`blocks/${folder}: mehr als eine .svelte-Datei — genau eine ist erlaubt.`);
        registry.components[folder] = component;
    }
    for (const name of Object.keys(registry.blocks)) {
        if (!registry.components[name])
            throw new Error(`blocks/${name}: Svelte-Komponente fehlt (genau eine .svelte-Datei im Ordner).`);
    }
    for (const [path, moduleExport] of Object.entries(input.collections ?? {})) {
        const definition = moduleExport;
        if (!definition || typeof definition !== 'object' || !definition.name)
            throw new Error(`${path}: default export muss defineCollection(...) sein.`);
        if (definition.name !== fileOf(path))
            throw new Error(`${path}: Collection-Name „${definition.name}" muss dem Dateinamen „${fileOf(path)}" entsprechen.`);
        registry.collections[definition.name] = definition;
    }
    for (const [path, moduleExport] of Object.entries(input.content ?? {})) {
        const content = moduleExport;
        if (!content || !Array.isArray(content.collections))
            throw new Error(`${path}: default export muss defineContent(...) sein.`);
        for (const definition of content.collections) {
            if (registry.collections[definition.name])
                throw new Error(`${path}: Collection „${definition.name}" existiert bereits (collections/${definition.name}.ts).`);
            registry.collections[definition.name] = definition;
        }
    }
    for (const [path, moduleExport] of Object.entries(input.mail ?? {})) {
        const definition = moduleExport;
        if (!definition || typeof definition !== 'object' || !definition.name)
            throw new Error(`${path}: default export muss defineMail(...) sein.`);
        if (definition.name !== fileOf(path))
            throw new Error(`${path}: Mail-Name „${definition.name}" muss dem Dateinamen „${fileOf(path)}" entsprechen.`);
        registry.mail[definition.name] = definition;
    }
    for (const [path, component] of Object.entries(input.previews ?? {})) {
        const name = fileOf(path);
        if (!registry.collections[name])
            throw new Error(`${path}: keine Collection „${name}" — Dateiname = Name der Collection.`);
        registry.previews[name] = component;
    }
    for (const collection of Object.values(registry.collections)) {
        for (const blockName of collection.blocks || [])
            if (!registry.blocks[blockName])
                throw new Error(`Collection „${collection.name}": unbekannter Block „${blockName}".`);
        checkReferences(`collections/${collection.name}`, collection.fields, registry);
    }
    for (const block of Object.values(registry.blocks))
        checkReferences(`blocks/${block.name}`, block.fields, registry);
    for (const mailTemplate of Object.values(registry.mail))
        checkReferences(`mail/${mailTemplate.name}`, mailTemplate.fields, registry);
    const home = registry.config.routing.home;
    if (!registry.collections[home.collection]) {
        throw new Error(`cms.config: routing.home.collection „${home.collection}" ist keine bekannte Collection.`);
    }
    return registry;
}
/** Allowed block types of a collection (empty when it has no blocks). */
export function allowedBlocks(collection) {
    return collection.blocks ? [...collection.blocks] : [];
}
