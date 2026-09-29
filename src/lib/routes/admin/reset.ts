import type { ServerLoadEvent } from '@sveltejs/kit';

/** "Set new password" page; the token comes from the link in the reset mail. */
export async function load({ url }: ServerLoadEvent) {
	return {
		token: url.searchParams.get('token') ?? '',
		invalid: url.searchParams.get('error') === 'INVALID_TOKEN'
	};
}
