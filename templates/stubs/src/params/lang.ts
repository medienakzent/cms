import { createLangMatcher } from '@compdata/cms/routes/params';
import registry from '../cms';

export const match = createLangMatcher(registry);
