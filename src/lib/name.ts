/** Names of blocks, collections and mail templates: lowercase, digits and dashes. */
export const NAME_RE = /^[a-z][a-z0-9-]*$/;

export function isValidName(name: string): boolean {
	return NAME_RE.test(name);
}
