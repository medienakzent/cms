import type { AdminLayoutData } from '../../routes/admin/layout';
import type { load } from '../../routes/admin/reset';
type $$ComponentProps = {
    data: AdminLayoutData & Awaited<ReturnType<typeof load>>;
};
declare const Reset: import("svelte").Component<$$ComponentProps, {}, "">;
type Reset = ReturnType<typeof Reset>;
export default Reset;
