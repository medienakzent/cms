import { getDb } from '../db';
import { createIndexRepo } from './repo';
let repo = null;
export async function getIndex() {
    if (!repo)
        repo = createIndexRepo(await getDb());
    return repo;
}
