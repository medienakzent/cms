import type { AdminLayoutData } from '../../routes/admin/layout';
import type { load } from '../../routes/admin/dashboard';
type $$ComponentProps = {
    data: AdminLayoutData & Awaited<ReturnType<typeof load>>;
};
declare const Dashboard: import("svelte").Component<$$ComponentProps, {}, "">;
type Dashboard = ReturnType<typeof Dashboard>;
export default Dashboard;
