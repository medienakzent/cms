export class ApiError extends Error {
    status;
    issues;
    constructor(status, message, issues = []) {
        super(message);
        this.status = status;
        this.issues = issues;
    }
}
/** Fetch wrapper for /api/v1; throws ApiError carrying validation issues. */
export async function apiFetch(path, init = {}) {
    const headers = new Headers(init.headers);
    let body = init.body;
    if (init.json !== undefined) {
        headers.set('content-type', 'application/json');
        body = JSON.stringify(init.json);
    }
    const response = await fetch(path, { ...init, headers, body });
    const data = (await response.json().catch(() => ({})));
    if (!response.ok) {
        throw new ApiError(response.status, data.error ?? response.statusText, data.issues ?? []);
    }
    return data;
}
export function issuesToMap(issues) {
    const messagesByPath = {};
    for (const issue of issues) {
        if (!messagesByPath[issue.path])
            messagesByPath[issue.path] = issue.message;
    }
    return messagesByPath;
}
