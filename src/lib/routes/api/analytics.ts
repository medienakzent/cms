import { json, type RequestEvent } from '@sveltejs/kit';
import { analytics, type LiveSnapshot, type VisitorRequest } from '../../server/analytics';
import { api, limitRequestBody } from '../../server/api';

const MAX_SIGNAL_BYTES = 2048;

function visitorRequest(event: RequestEvent): VisitorRequest {
	const headers = event.request.headers;
	return {
		ip: event.getClientAddress(),
		userAgent: headers.get('user-agent') ?? '',
		acceptLanguage: headers.get('accept-language'),
		mobileHint: headers.get('sec-ch-ua-mobile'),
		host: event.url.hostname,
		optOut: headers.get('dnt') === '1' || headers.get('sec-gpc') === '1'
	};
}

/**
 * POST /api/analytics: public, rate limited per IP. Receives page views and reading time
 * from the injected script; signed-in users are not counted.
 */
export const POST = async (event: RequestEvent) => {
	const ignored = new Response(null, { status: 204 });
	if (event.locals.user) return ignored;
	const origin = event.request.headers.get('origin');
	if (origin && origin !== event.url.origin) return new Response(null, { status: 403 });
	let signal: Record<string, unknown>;
	try {
		const parsed: unknown = JSON.parse(
			await limitRequestBody(event.request, MAX_SIGNAL_BYTES).text()
		);
		if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return ignored;
		signal = parsed as Record<string, unknown>;
	} catch {
		return new Response(null, { status: 400 });
	}
	if (signal.type === 'leave') {
		await analytics.recordReadingTime(signal.view, signal.seconds, visitorRequest(event));
		return ignored;
	}
	if (signal.type !== 'view') return ignored;
	const view = await analytics.recordView(signal, visitorRequest(event));
	return view ? json({ view }, { headers: { 'cache-control': 'no-store' } }) : ignored;
};

/** GET /api/v1/analytics?days=30&path=/about: visitor statistics for the site or one page. */
export const REPORT = async ({ url }: RequestEvent) =>
	api(() =>
		analytics.report({
			days: Number(url.searchParams.get('days') ?? 30),
			path: url.searchParams.get('path')
		})
	);

/**
 * GET /api/v1/analytics/live: Server-Sent Events with the active visits. Sends the current
 * state at once, then on every change, plus a comment line as keep-alive for proxies.
 */
export const LIVE = ({ request }: RequestEvent) => {
	const encoder = new TextEncoder();
	let cleanup = () => {};
	const stream = new ReadableStream<Uint8Array>({
		start(controller) {
			const send = (chunk: string) => {
				try {
					controller.enqueue(encoder.encode(chunk));
				} catch {
					cleanup();
				}
			};
			const sendSnapshot = (snapshot: LiveSnapshot) =>
				send(`data: ${JSON.stringify(snapshot)}\n\n`);
			sendSnapshot(analytics.live());
			const unsubscribe = analytics.subscribe(sendSnapshot);
			const keepAlive = setInterval(() => send(': ping\n\n'), 25_000);
			cleanup = () => {
				clearInterval(keepAlive);
				unsubscribe();
			};
			request.signal.addEventListener('abort', () => {
				cleanup();
				try {
					controller.close();
				} catch {
					// Already closed by the client.
				}
			});
		},
		cancel() {
			cleanup();
		}
	});
	return new Response(stream, {
		headers: {
			'content-type': 'text/event-stream',
			'cache-control': 'no-store',
			'x-accel-buffering': 'no'
		}
	});
};
