import { createAuthClient } from 'better-auth/svelte';

/** Client für Login/Logout im Browser (spricht mit /api/auth). */
export const authClient = createAuthClient();
