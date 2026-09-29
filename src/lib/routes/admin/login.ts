import { redirect, type ServerLoadEvent } from '@sveltejs/kit';
import { getDb } from '../../server/db';
import { serverConfig } from '../../server/runtime';

export async function load({ locals, url }: ServerLoadEvent) {
	if (locals.user) redirect(303, url.searchParams.get('returnTo') || '/admin');
	// Registrierung anbieten, wenn erlaubt oder noch kein Konto existiert (erster Nutzer wird Admin).
	let signup = serverConfig().allowSignup;
	if (!signup) {
		try {
			const row = await (await getDb()).get<{ n: number }>('SELECT COUNT(*) AS n FROM "user"');
			signup = Number(row?.n ?? 0) === 0;
		} catch {
			signup = false;
		}
	}
	return { returnTo: url.searchParams.get('returnTo') || '/admin', signup };
}
