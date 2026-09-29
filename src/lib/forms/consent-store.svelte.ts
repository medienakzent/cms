/**
 * Consent-Zustand im Browser: Entscheidung je Kategorie, Cookie + localStorage,
 * Dienste laden und Seitenwechsel melden. Ein Modul, überall dieselbe Wahrheit.
 */
import type { ConsentConfig, ConsentDecisions } from '../consent';

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
	const m = document.cookie.match(
		new RegExp(`(?:^|; )${name.replace(/[.$?*|{}()[\]\\/+^]/g, '\\$&')}=([^;]*)`)
	);
	return m ? decodeURIComponent(m[1]) : null;
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
		/* privater Modus o. ä. */
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
		if (stored.v !== config.version) return null; // neue Version → erneut fragen
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
		} catch (e) {
			console.warn(`[cms] Dienst ${service.id} konnte nicht geladen werden`, e);
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
	/** Vom <Consent>-Element beim Mount aufgerufen. */
	init(cfg: ConsentConfig) {
		config = cfg;
		const restored = restore();
		state.decisions = restored;
		if (restored) apply(restored);
		else if (cfg.categories.some((c) => !c.required) && cfg.services.length) state.open = true;
	},
	has(category: string): boolean {
		const c = config?.categories.find((x) => x.id === category);
		return !!c?.required || !!state.decisions?.[category];
	},
	set(decisions: ConsentDecisions) {
		if (!config) return;
		const full: ConsentDecisions = {};
		for (const c of config.categories) full[c.id] = c.required ? true : !!decisions[c.id];
		state.decisions = full;
		state.open = false;
		persist(full);
		apply(full);
	},
	acceptAll() {
		if (!config) return;
		consent.set(Object.fromEntries(config.categories.map((c) => [c.id, true])));
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
	/** Seitenwechsel an geladene Dienste melden (macht <Consent> per afterNavigate). */
	pageview(url: string) {
		for (const s of config?.services ?? []) if (state.loaded.has(s.id)) s.pageview?.(url);
	},
	/** Ereignis an geladene Dienste melden, z. B. `consent.track('formular_gesendet', { formular: 'contact' })`. */
	track(name: string, props?: Record<string, unknown>) {
		for (const s of config?.services ?? []) if (state.loaded.has(s.id)) s.event?.(name, props);
	}
};

/** Für Buttons wie „Cookie-Einstellungen" im Footer. */
export const openConsent = () => consent.show();
export const track = consent.track;
