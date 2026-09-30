import type { AdminLayoutData } from '../../routes/admin/layout';
import type { load } from '../../routes/admin/login';
type $$ComponentProps = {
    data: AdminLayoutData & Awaited<ReturnType<typeof load>>;
};
declare const Login: import("svelte").Component<$$ComponentProps, {}, "">;
type Login = ReturnType<typeof Login>;
export default Login;
