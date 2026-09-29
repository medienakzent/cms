import type { ServerLoadEvent } from '@sveltejs/kit';

/** Seite „Neues Passwort setzen" — Token kommt aus dem Link der Reset-Mail. */
export async function load({ url }: ServerLoadEvent) {
	return {
		token: url.searchParams.get('token') ?? '',
		invalid: url.searchParams.get('error') === 'INVALID_TOKEN'
	};
}
