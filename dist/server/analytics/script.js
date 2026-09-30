/**
 * Inline script injected into website pages. It stores nothing in the browser: it reports
 * each page path (client navigations included) and the visible reading time of that page.
 * History is patched before SvelteKit starts, so the router picks up the patched methods.
 */
export const ANALYTICS_ENDPOINT = '/api/analytics';
const source = `(() => {
	if (navigator.doNotTrack === '1' || navigator.globalPrivacyControl) return;
	const endpoint = '${ANALYTICS_ENDPOINT}';
	let currentPath = null;
	let viewId = null;
	let visibleSince = null;
	let visibleTotal = 0;

	function flush() {
		if (visibleSince !== null) {
			visibleTotal += Date.now() - visibleSince;
			visibleSince = null;
		}
		if (viewId && visibleTotal >= 1000)
			navigator.sendBeacon(endpoint, JSON.stringify({ type: 'leave', view: viewId, seconds: Math.round(visibleTotal / 1000) }));
	}

	function track() {
		const path = location.pathname;
		if (path === currentPath) return;
		flush();
		const referrer = currentPath === null ? document.referrer : '';
		currentPath = path;
		viewId = null;
		visibleTotal = 0;
		visibleSince = document.visibilityState === 'visible' ? Date.now() : null;
		const parameters = new URLSearchParams(location.search);
		const body = JSON.stringify({
			type: 'view',
			path,
			referrer,
			source: parameters.get('utm_source') || '',
			medium: parameters.get('utm_medium') || '',
			campaign: parameters.get('utm_campaign') || ''
		});
		fetch(endpoint, { method: 'POST', body, keepalive: true, credentials: 'same-origin' })
			.then((response) => (response.status === 200 ? response.json() : null))
			.then((result) => {
				if (result && currentPath === path) viewId = result.view;
			})
			.catch(() => {});
	}

	for (const method of ['pushState', 'replaceState']) {
		const original = history[method];
		history[method] = function (...parameters) {
			const result = original.apply(this, parameters);
			track();
			return result;
		};
	}
	addEventListener('popstate', track);
	addEventListener('pagehide', flush);
	document.addEventListener('visibilitychange', () => {
		if (document.visibilityState === 'hidden') flush();
		else visibleSince = Date.now();
	});
	track();
})();`;
export const ANALYTICS_SCRIPT = `<script>${source.replace(/\n\s*/g, ' ')}</script>`;
