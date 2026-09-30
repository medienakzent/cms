export class CmsError extends Error {
    status;
    issues;
    constructor(status, message, issues = []) {
        super(message);
        this.name = 'CmsError';
        this.status = status;
        this.issues = issues;
    }
}
export const notFound = (what) => new CmsError(404, `${what} nicht gefunden`);
export const conflict = (message) => new CmsError(409, message);
export const badRequest = (message) => new CmsError(400, message);
export const validation = (issues) => new CmsError(422, 'Validierung fehlgeschlagen', issues);
