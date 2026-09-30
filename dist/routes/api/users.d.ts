import type { RequestEvent } from '@sveltejs/kit';
/** POST /api/v1/users  { name, email, password, role } */
export declare const POST: (event: RequestEvent) => Promise<Response>;
/** PATCH /api/v1/users/<id>  { role?, password?, name?, banned?, twoFactor: false } */
export declare const PATCH_ITEM: (event: RequestEvent) => Promise<Response>;
/** DELETE /api/v1/users/<id> */
export declare const DELETE_ITEM: (event: RequestEvent) => Promise<Response>;
