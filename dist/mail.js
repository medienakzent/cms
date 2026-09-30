import { isValidName } from './name';
export function defineMail(options) {
    if (!isValidName(options.name)) {
        throw new Error(`Mail-Vorlage „${options.name}": Name nur a-z, 0-9, -`);
    }
    if (options.replyToField && !options.fields[options.replyToField]) {
        throw new Error(`Mail-Vorlage „${options.name}": replyToField „${options.replyToField}" fehlt in fields.`);
    }
    if (options.autoReply && !options.fields[options.autoReply.toField]) {
        throw new Error(`Mail-Vorlage „${options.name}": autoReply.toField „${options.autoReply.toField}" fehlt in fields.`);
    }
    return {
        name: options.name,
        label: options.label ?? options.name,
        fields: options.fields,
        to: options.to,
        replyToField: options.replyToField,
        subject: options.subject,
        body: options.body,
        autoReply: options.autoReply,
        honeypot: options.honeypot ?? 'website',
        maxTotalSize: options.maxTotalSize ?? 32 * 1024 * 1024,
        captcha: options.captcha ?? true
    };
}
export function localizedText(text, lang, fallback) {
    if (typeof text === 'string')
        return text;
    return text[lang] ?? text[fallback] ?? Object.values(text)[0] ?? '';
}
