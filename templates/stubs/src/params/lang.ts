import { createLangMatcher } from '@medienakzent/cms/routes/params';
import registry from '../cms';

export const match = createLangMatcher(registry);
