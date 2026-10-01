import type { Snippet } from 'svelte';
/** Frame of the sign-in pages (login, password reset): site icon, name and the current step. */
type Props = {
    siteName: string;
    favicon: string;
    /** Current step, e.g. "Anmelden" or "Neues Passwort setzen". */
    subtitle: string;
    children: Snippet;
};
declare const AuthShell: import("svelte").Component<Props, {}, "">;
type AuthShell = ReturnType<typeof AuthShell>;
export default AuthShell;
