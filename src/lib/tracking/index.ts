import type { ConsentService } from '../consent';

declare global {
	interface Window {
		dataLayer?: unknown[];
		gtag?: (...args: unknown[]) => void;
		_paq?: unknown[][];
	}
}

/** Skript einmalig laden. */
function loadScript(src: string, attrs: Record<string, string> = {}): Promise<void> {
	return new Promise((resolve, reject) => {
		if (document.querySelector(`script[src="${src}"]`)) return resolve();
		const s = document.createElement('script');
		s.src = src;
		s.async = true;
		for (const [k, v] of Object.entries(attrs)) s.setAttribute(k, v);
		s.onload = () => resolve();
		s.onerror = () => reject(new Error(`Skript konnte nicht geladen werden: ${src}`));
		document.head.appendChild(s);
	});
}

/**
 * Google Analytics 4 mit Consent Mode: Einwilligung wird vor dem Laden gesetzt,
 * IP-Anonymisierung ist bei GA4 Standard. Seitenwechsel werden manuell gemeldet.
 */
export function ga4(opts: {
	measurementId: string;
	category?: string;
	name?: string;
}): ConsentService {
	return {
		id: `ga4-${opts.measurementId}`,
		name: opts.name ?? 'Google Analytics',
		category: opts.category ?? 'analytics',
		load() {
			window.dataLayer = window.dataLayer ?? [];
			window.gtag = function gtag() {
				// eslint-disable-next-line prefer-rest-params
				window.dataLayer!.push(arguments);
			};
			window.gtag('consent', 'default', {
				ad_storage: 'denied',
				ad_user_data: 'denied',
				ad_personalization: 'denied',
				analytics_storage: 'granted'
			});
			window.gtag('js', new Date());
			window.gtag('config', opts.measurementId, { send_page_view: false });
			void loadScript(
				`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(opts.measurementId)}`
			);
		},
		pageview(url) {
			window.gtag?.('event', 'page_view', { page_location: url, page_title: document.title });
		},
		event(name, props) {
			window.gtag?.('event', name, props ?? {});
		}
	};
}

/** Matomo (selbst gehostet). `url` mit abschließendem Slash, z. B. https://stats.example.de/ */
export function matomo(opts: {
	url: string;
	siteId: string | number;
	category?: string;
	name?: string;
}): ConsentService {
	const base = opts.url.replace(/\/+$/, '') + '/';
	return {
		id: `matomo-${opts.siteId}`,
		name: opts.name ?? 'Matomo',
		category: opts.category ?? 'analytics',
		load() {
			window._paq = window._paq ?? [];
			window._paq.push(
				['setTrackerUrl', `${base}matomo.php`],
				['setSiteId', String(opts.siteId)],
				['enableLinkTracking']
			);
			void loadScript(`${base}matomo.js`);
		},
		pageview(url) {
			window._paq?.push(
				['setCustomUrl', url],
				['setDocumentTitle', document.title],
				['trackPageView']
			);
		},
		event(name, props) {
			window._paq?.push([
				'trackEvent',
				String(props?.category ?? 'site'),
				name,
				props?.label !== undefined ? String(props.label) : undefined
			]);
		}
	};
}

/** Beliebiges Skript (z. B. Chat-Widget, Karten), erst nach Einwilligung. */
export function script(opts: {
	id: string;
	name: string;
	category: string;
	src?: string;
	inline?: string;
	attrs?: Record<string, string>;
}): ConsentService {
	return {
		id: opts.id,
		name: opts.name,
		category: opts.category,
		load() {
			if (opts.src) void loadScript(opts.src, opts.attrs);
			if (opts.inline) {
				const s = document.createElement('script');
				s.textContent = opts.inline;
				document.head.appendChild(s);
			}
		}
	};
}
