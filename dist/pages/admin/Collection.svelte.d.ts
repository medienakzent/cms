import type { AdminLayoutData } from '../../routes/admin/layout';
import type { load } from '../../routes/admin/collection';
type $$ComponentProps = {
    data: AdminLayoutData & Awaited<ReturnType<typeof load>>;
};
declare const Collection: import("svelte").Component<$$ComponentProps, {}, "">;
type Collection = ReturnType<typeof Collection>;
export default Collection;
