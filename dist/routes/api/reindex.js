import { api, requireAdmin } from '../../server/api';
import { cms } from '../../server';
/** POST /api/v1/reindex (admin only) */
export const POST = (event) => api(async () => {
    requireAdmin(event);
    return cms.reindex();
});
