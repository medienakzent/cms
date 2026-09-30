import type { AdminLayoutData } from '../../routes/admin/layout';
import type { load } from '../../routes/admin/users';
type $$ComponentProps = {
    data: AdminLayoutData & Awaited<ReturnType<typeof load>>;
};
declare const Users: import("svelte").Component<$$ComponentProps, {}, "">;
type Users = ReturnType<typeof Users>;
export default Users;
