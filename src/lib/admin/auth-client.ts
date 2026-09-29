import { createAuthClient } from 'better-auth/svelte';

/** Browser client for login/logout (talks to /api/auth). */
export const authClient = createAuthClient();
