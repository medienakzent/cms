import type { AdminCollection } from './types';
type Props = {
    collections: AdminCollection[];
    pathname: string;
    user: {
        name: string;
        email: string;
        image: string;
        role: string;
    };
    siteName: string;
    favicon: string;
    /** Show the page for the second factor (TWO_FACTOR not off). */
    twoFactor: boolean;
};
declare const AdminSidebar: import("svelte").Component<Props, {}, "">;
type AdminSidebar = ReturnType<typeof AdminSidebar>;
export default AdminSidebar;
