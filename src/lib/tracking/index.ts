import type { ConsentService } from '../consent';

declare global {
	interface Window {
		dataLayer?: unknown[];
		gtag?: (...args: unknown[]) => void;
		_paq?: unknown[][];
	}
}

/** Loads a script once. */
function loadScript(src: string, attributes: Record<string, string> = {}): Promise<void> {
	return new Promise((resolve, reject) => {
		if (document.querySelector(`script[src="${src}"]`)) return resolve();
		const scriptElement = document.createElement('script');
		scriptElement.src = src;
		scriptElement.async = true;
		for (const [name, value] of Object.entries(attributes)) scriptElement.setAttribute(name, value);
		scriptElement.onload = () => resolve();
		scriptElement.onerror = () => reject(new Error(`Skript konnte nicht geladen werden: ${src}`));
		document.head.appendChild(scriptElement);
	});
}

/**
 * Google Analytics 4 with Consent Mode: consent is set before loading, IP anonymization
 * is the GA4 default. Page changes are reported manually.
 */
export function ga4(options: {
	measurementId: string;
	category?: string;
	name?: string;
}): ConsentService {
	return {
		id: `ga4-${options.measurementId}`,
		name: options.name ?? 'Google Analytics',
		category: options.category ?? 'analytics',
		load() {
			window.dataLayer = window.dataLayer ?? [];
			window.gtag = function gtag() {
				// gtag requires the raw `arguments` object, not a rest array.
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
			window.gtag('config', options.measurementId, { send_page_view: false });
			void loadScript(
				`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(options.measurementId)}`
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

/** Matomo (self-hosted). `url` with trailing slash, e.g. https://stats.example.de/ */
export function matomo(options: {
	url: string;
	siteId: string | number;
	category?: string;
	name?: string;
}): ConsentService {
	const baseUrl = options.url.replace(/\/+$/, '') + '/';
	return {
		id: `matomo-${options.siteId}`,
		name: options.name ?? 'Matomo',
		category: options.category ?? 'analytics',
		load() {
			window._paq = window._paq ?? [];
			window._paq.push(
				['setTrackerUrl', `${baseUrl}matomo.php`],
				['setSiteId', String(options.siteId)],
				['enableLinkTracking']
			);
			void loadScript(`${baseUrl}matomo.js`);
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

/** Any script (chat widget, maps, ...), loaded only after consent. */
export function script(options: {
	id: string;
	name: string;
	category: string;
	src?: string;
	inline?: string;
	attrs?: Record<string, string>;
}): ConsentService {
	return {
		id: options.id,
		name: options.name,
		category: options.category,
		load() {
			if (options.src) void loadScript(options.src, options.attrs);
			if (options.inline) {
				const scriptElement = document.createElement('script');
				scriptElement.textContent = options.inline;
				document.head.appendChild(scriptElement);
			}
		}
	};
}
