import { type ConsentConfig } from '../consent';
/**
 * Privacy banner with settings. Place once in the website layout:
 *
 *   <Consent config={registry.config.consent} lang={data.lang} />
 *
 * The `cms-consent*` classes are deliberately plain and overridable with custom CSS.
 */
type Props = {
    config: ConsentConfig | null | undefined;
    lang?: string;
    class?: string;
};
declare const Consent: import("svelte").Component<Props, {}, "">;
type Consent = ReturnType<typeof Consent>;
export default Consent;
