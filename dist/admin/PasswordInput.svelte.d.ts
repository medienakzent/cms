type Props = {
    value: string;
    id: string;
    required?: boolean;
    minlength?: number;
    autocomplete?: 'new-password' | 'current-password';
    /** Offer a generated password (new accounts, new passwords). */
    generate?: boolean;
    invalid?: boolean;
};
declare const PasswordInput: import("svelte").Component<Props, {}, "value">;
type PasswordInput = ReturnType<typeof PasswordInput>;
export default PasswordInput;
