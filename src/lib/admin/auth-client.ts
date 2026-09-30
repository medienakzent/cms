import { createAuthClient } from 'better-auth/svelte';
import { twoFactorClient } from 'better-auth/client/plugins';

/** Browser client for login/logout and the second factor (talks to /api/auth). */
export const authClient = createAuthClient({ plugins: [twoFactorClient()] });

const MESSAGES: Record<string, string> = {
	INVALID_PASSWORD: 'Das Passwort stimmt nicht.',
	INVALID_EMAIL_OR_PASSWORD: 'E-Mail oder Passwort stimmen nicht.',
	INVALID_CODE: 'Der Code stimmt nicht. Bitte den aktuellen Code aus der App eingeben.',
	INVALID_BACKUP_CODE: 'Dieser Backup-Code ist ungültig oder wurde schon verwendet.',
	TOO_MANY_ATTEMPTS_REQUEST_NEW_CODE: 'Zu viele Versuche. Bitte erneut anmelden.',
	ACCOUNT_TEMPORARILY_LOCKED: 'Zu viele Fehlversuche. Das Konto ist vorübergehend gesperrt.',
	INVALID_TWO_FACTOR_COOKIE: 'Die Anmeldung ist abgelaufen. Bitte erneut mit Passwort anmelden.',
	TOTP_ALREADY_ENABLED: 'Die Zwei-Faktor-Anmeldung ist bereits eingerichtet.'
};

/** German message for an error returned by the auth client. */
export function authErrorMessage(
	error: { code?: string; message?: string } | null | undefined,
	fallback: string
): string {
	return (error?.code && MESSAGES[error.code]) || error?.message || fallback;
}
