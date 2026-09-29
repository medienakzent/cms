import type { RequestEvent } from '@sveltejs/kit';
import { api, requireAdmin } from '../../server/api';
import { cms } from '../../server';

/** POST /api/v1/reindex (nur Admin) */
export const POST = (event: RequestEvent) =>
	api(async () => {
		requireAdmin(event);
		return cms.reindex();
	});
