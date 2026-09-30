/**
 * Pure helpers for visitor statistics: everything is reduced to coarse categories
 * before it is stored, so no raw user agent, IP or full referrer URL is kept.
 */
const BOT_PATTERN = /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|monitor|uptime|curl|wget|python|java\/|go-http|axios|node-fetch|facebookexternalhit|embedly|whatsapp|telegram/i;
const SEARCH_HOSTS = [
    'google.',
    'bing.com',
    'duckduckgo.com',
    'ecosia.org',
    'yahoo.',
    'startpage.com',
    'qwant.com',
    'search.brave.com',
    'yandex.',
    'baidu.com',
    'web.de',
    'gmx.net',
    't-online.de'
];
const SOCIAL_HOSTS = [
    'facebook.com',
    'instagram.com',
    'linkedin.com',
    'lnkd.in',
    'xing.com',
    't.co',
    'x.com',
    'twitter.com',
    'pinterest.',
    'youtube.com',
    'reddit.com',
    'tiktok.com',
    'threads.net',
    'bsky.app',
    'mastodon.'
];
export function isBot(userAgent) {
    return !userAgent || BOT_PATTERN.test(userAgent);
}
/** Path without query, fragment and trailing slash; null for anything that is not a plain site path. */
export function normalizePath(value) {
    if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//'))
        return null;
    const path = value.split(/[?#]/)[0];
    if (path.length > 300 || /[\u0000-\u001f\u007f]/.test(path))
        return null;
    return path.length > 1 ? path.replace(/\/+$/, '') || '/' : path;
}
/** Host of an external referrer without `www.`; empty for none, own host or invalid input. */
export function referrerHost(value, ownHost) {
    if (typeof value !== 'string' || !value)
        return '';
    try {
        const url = new URL(value);
        if (url.protocol !== 'http:' && url.protocol !== 'https:' && url.protocol !== 'android-app:')
            return '';
        const host = url.hostname.toLowerCase().replace(/^www\./, '');
        return host && host !== ownHost.toLowerCase().replace(/^www\./, '') ? host.slice(0, 100) : '';
    }
    catch {
        return '';
    }
}
/** Short campaign label (utm_*): lower case, limited length. */
export function campaignValue(value) {
    return typeof value === 'string'
        ? value
            .trim()
            .toLowerCase()
            .replace(/[\u0000-\u001f\u007f]/g, '')
            .slice(0, 60)
        : '';
}
const matchesHost = (host, patterns) => patterns.some((pattern) => pattern.endsWith('.')
    ? host.startsWith(pattern) || host.includes(`.${pattern}`)
    : host === pattern || host.endsWith(`.${pattern}`));
export function channelOf(referrer, source) {
    if (source)
        return 'campaign';
    if (!referrer)
        return 'direct';
    if (matchesHost(referrer, SEARCH_HOSTS))
        return 'search';
    if (matchesHost(referrer, SOCIAL_HOSTS))
        return 'social';
    return 'referral';
}
export function deviceOf(userAgent, mobileHint) {
    if (/ipad|tablet|kindle|silk|playbook/i.test(userAgent))
        return 'tablet';
    if (/android/i.test(userAgent) && !/mobile/i.test(userAgent))
        return 'tablet';
    if (mobileHint === '?1' || /mobi|iphone|ipod|android|phone/i.test(userAgent))
        return 'mobile';
    return 'desktop';
}
export function browserOf(userAgent) {
    if (/edg(e|a|ios)?\//i.test(userAgent))
        return 'Edge';
    if (/opr\/|opera/i.test(userAgent))
        return 'Opera';
    if (/samsungbrowser/i.test(userAgent))
        return 'Samsung Internet';
    if (/firefox|fxios/i.test(userAgent))
        return 'Firefox';
    if (/chrome|crios|chromium/i.test(userAgent))
        return 'Chrome';
    if (/safari/i.test(userAgent))
        return 'Safari';
    return 'Andere';
}
export function osOf(userAgent) {
    if (/iphone|ipad|ipod/i.test(userAgent))
        return 'iOS';
    if (/android/i.test(userAgent))
        return 'Android';
    if (/windows/i.test(userAgent))
        return 'Windows';
    if (/mac os x|macintosh/i.test(userAgent))
        return 'macOS';
    if (/cros/i.test(userAgent))
        return 'ChromeOS';
    if (/linux/i.test(userAgent))
        return 'Linux';
    return 'Andere';
}
/** Primary language of the browser (`de`, `en`, …) from Accept-Language. */
export function languageOf(acceptLanguage) {
    const primary = (acceptLanguage ?? '').split(',')[0]?.trim().split(/[-;_]/)[0]?.toLowerCase();
    return primary && /^[a-z]{2,3}$/.test(primary) ? primary : '';
}
/** Calendar day (YYYY-MM-DD) and hour in the given time zone. */
export function localTime(date, timeZone) {
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        hourCycle: 'h23'
    })
        .formatToParts(date)
        .map((part) => [part.type, part.value]));
    return { day: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour) };
}
/** Shifts a calendar day by whole days. */
export function addDays(day, days) {
    const date = new Date(`${day}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
}
