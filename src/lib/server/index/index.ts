import { getDb } from '../db';
import { createIndexRepo, type IndexRepo } from './repo';

let repo: IndexRepo | null = null;

export async function getIndex(): Promise<IndexRepo> {
	if (!repo) repo = createIndexRepo(await getDb());
	return repo;
}
