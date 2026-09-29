/**
 * Consent state in the browser: decision per category, cookie + localStorage, loading
 * services and reporting page changes. One module, one truth everywhere.
 */
import type { ConsentConfig, ConsentDecisions } from '../consent';

/** Persisted payload; the short keys are the stored cookie format. */
interface Stored {
	v: number;
	d: ConsentDecisions;
	t: string;
}

const state = $state({
	decisions: null as ConsentDecisions | null,
	open: false,
	loaded: new Set<string>()
});

let config: ConsentConfig | null = null;

function readCookie(name: string): string | null {
	if (typeof document === 'undefined') return null;
	const match = document.cookie.match(
		new RegExp(`(?:^|; )${name.replace(/[.$?*|{}()[\]\\/+^]/g, '\\$&')}=([^;]*)`)
	);
	return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(name: string, value: string, days: number) {
	const secure = location.protocol === 'https:' ? '; Secure' : '';
	document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${days * 86400}; Path=/; SameSite=Lax${secure}`;
}

function persist(decisions: ConsentDecisions) {
	if (!config) return;
	const stored: Stored = { v: config.version, d: decisions, t: new Date().toISOString() };
	const raw = JSON.stringify(stored);
	writeCookie(config.cookieName, raw, config.days);
	try {
		localStorage.setItem(config.cookieName, raw);
	} catch {
		/* private mode or similar */
	}
}

function restore(): ConsentDecisions | null {
	if (!config) return null;
	let raw = readCookie(config.cookieName);
	if (!raw) {
		try {
			raw = localStorage.getItem(config.cookieName);
		} catch {
			raw = null;
		}
	}
	if (!raw) return null;
	try {
		const stored = JSON.parse(raw) as Stored;
		// A new config version asks again.
		if (stored.v !== config.version) return null;
		return stored.d;
	} catch {
		return null;
	}
}

function apply(decisions: ConsentDecisions) {
	if (!config) return;
	for (const service of config.services) {
		if (!decisions[service.category] || state.loaded.has(service.id)) continue;
		try {
			void service.load();
			state.loaded.add(service.id);
			service.pageview?.(location.href);
		} catch (error) {
			console.warn(`[cms] Dienst ${service.id} konnte nicht geladen werden`, error);
		}
	}
}

export const consent = {
	get decisions() {
		return state.decisions;
	},
	get open() {
		return state.open;
	},
	get config() {
		return config;
	},
	/** Called by the <Consent> element on mount. */
	init(consentConfig: ConsentConfig) {
		config = consentConfig;
		const restored = restore();
		state.decisions = restored;
		if (restored) apply(restored);
		else if (
			consentConfig.categories.some((category) => !category.required) &&
			consentConfig.services.length
		)
			state.open = true;
	},
	has(category: string): boolean {
		const definition = config?.categories.find((entry) => entry.id === category);
		return !!definition?.required || !!state.decisions?.[category];
	},
	set(decisions: ConsentDecisions) {
		if (!config) return;
		const full: ConsentDecisions = {};
		for (const category of config.categories)
			full[category.id] = category.required ? true : !!decisions[category.id];
		state.decisions = full;
		state.open = false;
		persist(full);
		apply(full);
	},
	acceptAll() {
		if (!config) return;
		consent.set(Object.fromEntries(config.categories.map((category) => [category.id, true])));
	},
	rejectAll() {
		consent.set({});
	},
	show() {
		state.open = true;
	},
	hide() {
		state.open = false;
	},
	/** Reports a page change to loaded services (<Consent> does this via afterNavigate). */
	pageview(url: string) {
		for (const service of config?.services ?? [])
			if (state.loaded.has(service.id)) service.pageview?.(url);
	},
	/** Reports an event to loaded services, e.g. `consent.track('formular_gesendet', { formular: 'contact' })`. */
	track(name: string, props?: Record<string, unknown>) {
		for (const service of config?.services ?? [])
			if (state.loaded.has(service.id)) service.event?.(name, props);
	}
};

/** For buttons like "Cookie-Einstellungen" in the footer. */
export const openConsent = () => consent.show();
export const track = consent.track;
