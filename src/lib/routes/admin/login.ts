import { redirect, type ServerLoadEvent } from '@sveltejs/kit';

export async function load({ locals, url }: ServerLoadEvent) {
	if (locals.user) redirect(303, url.searchParams.get('returnTo') || '/admin');
	return { returnTo: url.searchParams.get('returnTo') || '/admin' };
}
