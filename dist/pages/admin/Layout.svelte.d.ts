import type { Snippet } from 'svelte';
import type { Registry } from '../../registry';
import type { AdminLayoutData } from '../../routes/admin/layout';
type $$ComponentProps = {
    data: AdminLayoutData;
    children: Snippet;
    registry: Registry;
};
declare const Layout: import("svelte").Component<$$ComponentProps, {}, "">;
type Layout = ReturnType<typeof Layout>;
export default Layout;
