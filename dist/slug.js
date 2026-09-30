const REPLACEMENTS = {
    ä: 'ae',
    ö: 'oe',
    ü: 'ue',
    ß: 'ss',
    æ: 'ae',
    ø: 'o',
    å: 'a'
};
export function slugify(input) {
    return input
        .toLowerCase()
        .replace(/[äöüßæøå]/g, (character) => REPLACEMENTS[character] ?? character)
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80);
}
export const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
export function isValidSlug(slug) {
    return SLUG_RE.test(slug) && slug.length <= 80;
}
