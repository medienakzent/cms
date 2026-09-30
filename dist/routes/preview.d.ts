import { type ServerLoadEvent } from '@sveltejs/kit';
/**
 * Live preview frame of the editor, mounted inside the site layout so the customer's
 * stylesheet, fonts and layout data apply. Only signed-in users may open it.
 */
export declare function load({ locals, params }: ServerLoadEvent): Promise<{
    title: string;
    lang: string;
}>;
