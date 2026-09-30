/**
 * Field definitions are the single source of truth for a content type: the component
 * props (types.ts), validation (validate.ts), the admin form (admin/FieldEditor.svelte)
 * and the base/overlay split (localize.ts) are all derived from a `FieldMap`.
 *
 * `localized` is all-or-nothing per field. Leaves inside a `group` may be localized
 * individually; inside a `list` they may not (the whole list is localized instead).
 */
/** Field builder: `field.text({ localized: true, required: true })`. */
export const field = {
    text: (options = {}) => ({ kind: 'text', ...options }),
    textarea: (options = {}) => ({
        kind: 'textarea',
        ...options
    }),
    richtext: (options = {}) => ({
        kind: 'richtext',
        ...options
    }),
    number: (options = {}) => ({ kind: 'number', ...options }),
    boolean: (options = {}) => ({
        kind: 'boolean',
        ...options
    }),
    date: (options = {}) => ({ kind: 'date', ...options }),
    select: (choices, options = {}) => ({ kind: 'select', options: choices, ...options }),
    multiselect: (choices, options = {}) => ({ kind: 'multiselect', options: choices, ...options }),
    media: (options = {}) => ({ kind: 'media', ...options }),
    link: (options = {}) => ({ kind: 'link', ...options }),
    reference: (collection, options = {}) => ({
        kind: 'reference',
        collection,
        ...options
    }),
    references: (collection, options = {}) => ({ kind: 'references', collection, ...options }),
    list: (of, options = {}) => ({
        kind: 'list',
        of,
        ...options
    }),
    group: (fields, options = {}) => ({ kind: 'group', fields, ...options }),
    blocks: (options = {}) => ({ kind: 'blocks', ...options }),
    file: (options = {}) => ({ kind: 'file', ...options })
};
export function optionValue(option) {
    return typeof option === 'string' ? option : option.value;
}
export function optionLabel(option) {
    return typeof option === 'string' ? option : option.label;
}
export function fieldLabel(key, fieldDefinition) {
    return (fieldDefinition.label ??
        key.replace(/[_-]+/g, ' ').replace(/^\w/, (character) => character.toUpperCase()));
}
