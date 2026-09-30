export function parseAddress(value) {
    const match = /^\s*(?:"?([^"<]*)"?\s*)?<([^>]+)>\s*$/.exec(value);
    if (match)
        return { name: (match[1] ?? '').trim(), address: match[2].trim() };
    return { name: '', address: value.trim() };
}
export function isEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
