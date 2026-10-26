import { getAuth } from '../../server/auth';
/**
 * /api/auth/…: Better Auth. The hook answers these requests before routing; the route exists so
 * that a site catch-all with `trailingSlash = 'always'` does not match and redirect them.
 */
async function handler({ request }) {
    return (await getAuth()).handler(request);
}
export const GET = handler;
export const POST = handler;
