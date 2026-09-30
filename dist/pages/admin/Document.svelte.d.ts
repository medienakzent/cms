import type { AdminLayoutData } from '../../routes/admin/layout';
import type { load } from '../../routes/admin/document';
type $$ComponentProps = {
    data: AdminLayoutData & Awaited<ReturnType<typeof load>>;
};
declare const Document: import("svelte").Component<$$ComponentProps, {}, "">;
type Document = ReturnType<typeof Document>;
export default Document;
