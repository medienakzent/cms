import type { SessionUser } from '@medienakzent/cms/server';

declare global {
	namespace App {
		interface Locals {
			user: SessionUser | null;
		}
		interface Error {
			message: string;
		}
	}
}

export {};
