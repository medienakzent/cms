import { getIndex } from '../../server/index/index';
import { getRuntime } from '../../server/runtime';
/** GET /api/health: for Docker health checks and monitoring; no login, no details exposed */
export const GET = async () => {
    let db = 'ok';
    try {
        await (await getIndex()).countByCollection();
    }
    catch {
        db = 'error';
    }
    const body = { ok: db === 'ok', db, site: getRuntime().config.site.name };
    return new Response(JSON.stringify(body), {
        status: body.ok ? 200 : 503,
        headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }
    });
};
