/** Only relative links and http(s), mailto and tel targets are allowed. */
export declare function safeUrl(href: string): string | null;
/** Markdown from editors: raw HTML is escaped, link targets are restricted. */
export declare function renderMarkdown(source: string): string;
