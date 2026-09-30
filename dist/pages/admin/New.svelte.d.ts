import type { load } from '../../routes/admin/new';
type FormResult = {
    error?: string;
    title?: string;
    slug?: string;
} | null | undefined;
type $$ComponentProps = {
    data: Awaited<ReturnType<typeof load>>;
    form: FormResult;
};
declare const New: import("svelte").Component<$$ComponentProps, {}, "">;
type New = ReturnType<typeof New>;
export default New;
