import type { RequestEvent } from '@sveltejs/kit';
import { actorOf, api } from '../../server/api';
import { collection } from '../../server/content';

/** GET /api/v1/<collection>/<slug>/versions */
export const GET = (event: RequestEvent) =>
	api(async () => ({
		items: await collection(event.params.collection ?? '').versions(event.params.slug ?? '')
	}));

/** POST /api/v1/<collection>/<slug>/versions/<version>/restore */
export const RESTORE = (event: RequestEvent) =>
	api(async () => {
		await collection(event.params.collection ?? '').restore(
			event.params.slug ?? '',
			event.params.version ?? '',
			actorOf(event)
		);
		return { ok: true };
	});
