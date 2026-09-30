/**
 * Authentication via Better Auth: local account (email + password) plus OAuth
 * providers enabled through environment variables. Better Auth creates its own
 * tables in the configured database (see init.ts).
 */
import { betterAuth } from 'better-auth';
export type Role = 'admin' | 'editor';
export declare const roles: {
    admin: import("better-auth/plugins").Role<import("better-auth/plugins").ExactRoleStatements<{
        readonly user: readonly ["create", "list", "set-role", "ban", "impersonate", "delete", "set-password", "set-email", "get", "update"];
        readonly session: readonly ["list", "revoke", "delete"];
    }>, {
        readonly user: readonly ["create", "list", "set-role", "ban", "impersonate", "impersonate-admins", "delete", "set-password", "set-email", "get", "update"];
        readonly session: readonly ["list", "revoke", "delete"];
    }>;
    editor: import("better-auth/plugins").Role<import("better-auth/plugins").ExactRoleStatements<{}>, {
        readonly user: readonly ["create", "list", "set-role", "ban", "impersonate", "impersonate-admins", "delete", "set-password", "set-email", "get", "update"];
        readonly session: readonly ["list", "revoke", "delete"];
    }>;
};
export interface SessionUser {
    id: string;
    name: string;
    email: string;
    image: string;
    role: Role;
    /** true for API keys (no browser account) */
    api?: boolean;
    /** Second factor set up (authenticator app). */
    twoFactorEnabled?: boolean;
}
type AuthDatabase = NonNullable<Parameters<typeof betterAuth>[0]['database']>;
declare function createAuth(database: AuthDatabase, countUsers: () => Promise<number>): import("better-auth").Auth<{
    baseURL: string | undefined;
    basePath: string;
    secret: string | undefined;
    database: any;
    rateLimit: {
        enabled: true;
        window: number;
        max: number;
    };
    trustedOrigins: (request?: Request) => string[];
    emailAndPassword: {
        enabled: true;
        sendResetPassword: ({ user, url }: {
            user: import("better-auth").User;
            url: string;
            token: string;
        }) => Promise<void>;
        resetPasswordTokenExpiresIn: number;
    };
    plugins: [{
        id: "admin";
        version: string;
        init(): {
            options: {
                databaseHooks: {
                    user: {
                        create: {
                            before(user: {
                                id: string;
                                createdAt: Date;
                                updatedAt: Date;
                                email: string;
                                emailVerified: boolean;
                                name: string;
                                image?: string | null | undefined;
                            } & Record<string, unknown>): Promise<{
                                data: {
                                    id: string;
                                    createdAt: Date;
                                    updatedAt: Date;
                                    email: string;
                                    emailVerified: boolean;
                                    name: string;
                                    image?: string | null | undefined;
                                    role: string;
                                };
                            }>;
                        };
                    };
                    session: {
                        create: {
                            before(session: {
                                id: string;
                                createdAt: Date;
                                updatedAt: Date;
                                userId: string;
                                expiresAt: Date;
                                token: string;
                                ipAddress?: string | null | undefined;
                                userAgent?: string | null | undefined;
                            } & Record<string, unknown>, ctx: import("better-auth").GenericEndpointContext | null): Promise<void>;
                        };
                    };
                };
            };
        };
        hooks: {
            after: {
                matcher(context: import("better-auth").HookEndpointContext): boolean;
                handler: import("better-call").Middleware<import("better-call").MiddlewareOptions, (inputContext: import("better-call").MiddlewareInputContext<import("better-call").MiddlewareOptions>) => Promise<import("better-auth/plugins").SessionWithImpersonatedBy[] | undefined>>;
            }[];
        };
        endpoints: {
            setRole: import("better-call").StrictEndpoint<"/admin/set-role", {
                method: "POST";
                body: import("zod").ZodObject<{
                    userId: import("zod").ZodCoercedString<unknown>;
                    role: import("zod").ZodUnion<readonly [import("zod").ZodString, import("zod").ZodArray<import("zod").ZodString>]>;
                }, import("zod/v4/core").$strip>;
                requireHeaders: true;
                use: import("better-call").Middleware<import("better-call").MiddlewareOptions, (inputContext: import("better-call").MiddlewareInputContext<import("better-call").MiddlewareOptions>) => Promise<{
                    session: {
                        user: import("better-auth/plugins").UserWithRole;
                        session: {
                            id: string;
                            createdAt: Date;
                            updatedAt: Date;
                            userId: string;
                            expiresAt: Date;
                            token: string;
                            ipAddress?: string | null | undefined;
                            userAgent?: string | null | undefined;
                        };
                    };
                }>>[];
                metadata: {
                    openapi: {
                        operationId: string;
                        summary: string;
                        description: string;
                        responses: {
                            200: {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            type: "object";
                                            properties: {
                                                user: {
                                                    $ref: string;
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                    $Infer: {
                        body: {
                            userId: string;
                            role: "admin" | "editor" | ("admin" | "editor")[];
                        };
                    };
                };
            }, {
                user: import("better-auth/plugins").UserWithRole;
            }>;
            getUser: import("better-call").StrictEndpoint<"/admin/get-user", {
                method: "GET";
                query: import("zod").ZodObject<{
                    id: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
                use: import("better-call").Middleware<import("better-call").MiddlewareOptions, (inputContext: import("better-call").MiddlewareInputContext<import("better-call").MiddlewareOptions>) => Promise<{
                    session: {
                        user: import("better-auth/plugins").UserWithRole;
                        session: {
                            id: string;
                            createdAt: Date;
                            updatedAt: Date;
                            userId: string;
                            expiresAt: Date;
                            token: string;
                            ipAddress?: string | null | undefined;
                            userAgent?: string | null | undefined;
                        };
                    };
                }>>[];
                metadata: {
                    openapi: {
                        operationId: string;
                        summary: string;
                        description: string;
                        responses: {
                            200: {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            type: "object";
                                            properties: {
                                                user: {
                                                    $ref: string;
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
            }, import("better-auth/plugins").UserWithRole>;
            createUser: import("better-call").StrictEndpoint<"/admin/create-user", {
                method: "POST";
                body: import("zod").ZodObject<{
                    email: import("zod").ZodString;
                    password: import("zod").ZodOptional<import("zod").ZodString>;
                    name: import("zod").ZodString;
                    role: import("zod").ZodOptional<import("zod").ZodUnion<readonly [import("zod").ZodString, import("zod").ZodArray<import("zod").ZodString>]>>;
                    data: import("zod").ZodOptional<import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodAny>>;
                }, import("zod/v4/core").$strip>;
                metadata: {
                    openapi: {
                        operationId: string;
                        summary: string;
                        description: string;
                        responses: {
                            200: {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            type: "object";
                                            properties: {
                                                user: {
                                                    $ref: string;
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                    $Infer: {
                        body: {
                            email: string;
                            password?: string | undefined;
                            name: string;
                            role?: "admin" | "editor" | ("admin" | "editor")[] | undefined;
                            data?: Record<string, any> | undefined;
                        };
                    };
                };
            }, {
                user: import("better-auth/plugins").UserWithRole;
            }>;
            adminUpdateUser: import("better-call").StrictEndpoint<"/admin/update-user", {
                method: "POST";
                body: import("zod").ZodObject<{
                    userId: import("zod").ZodCoercedString<unknown>;
                    data: import("zod").ZodRecord<import("zod").ZodAny, import("zod").ZodAny>;
                }, import("zod/v4/core").$strip>;
                use: import("better-call").Middleware<import("better-call").MiddlewareOptions, (inputContext: import("better-call").MiddlewareInputContext<import("better-call").MiddlewareOptions>) => Promise<{
                    session: {
                        user: import("better-auth/plugins").UserWithRole;
                        session: {
                            id: string;
                            createdAt: Date;
                            updatedAt: Date;
                            userId: string;
                            expiresAt: Date;
                            token: string;
                            ipAddress?: string | null | undefined;
                            userAgent?: string | null | undefined;
                        };
                    };
                }>>[];
                metadata: {
                    openapi: {
                        operationId: string;
                        summary: string;
                        description: string;
                        responses: {
                            200: {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            type: "object";
                                            properties: {
                                                user: {
                                                    $ref: string;
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
            }, import("better-auth/plugins").UserWithRole>;
            listUsers: import("better-call").StrictEndpoint<"/admin/list-users", {
                method: "GET";
                use: import("better-call").Middleware<import("better-call").MiddlewareOptions, (inputContext: import("better-call").MiddlewareInputContext<import("better-call").MiddlewareOptions>) => Promise<{
                    session: {
                        user: import("better-auth/plugins").UserWithRole;
                        session: {
                            id: string;
                            createdAt: Date;
                            updatedAt: Date;
                            userId: string;
                            expiresAt: Date;
                            token: string;
                            ipAddress?: string | null | undefined;
                            userAgent?: string | null | undefined;
                        };
                    };
                }>>[];
                query: import("zod").ZodObject<{
                    searchValue: import("zod").ZodOptional<import("zod").ZodString>;
                    searchField: import("zod").ZodOptional<import("zod").ZodEnum<{
                        email: "email";
                        name: "name";
                    }>>;
                    searchOperator: import("zod").ZodOptional<import("zod").ZodEnum<{
                        contains: "contains";
                        starts_with: "starts_with";
                        ends_with: "ends_with";
                    }>>;
                    limit: import("zod").ZodOptional<import("zod").ZodUnion<[import("zod").ZodString, import("zod").ZodNumber]>>;
                    offset: import("zod").ZodOptional<import("zod").ZodUnion<[import("zod").ZodString, import("zod").ZodNumber]>>;
                    sortBy: import("zod").ZodOptional<import("zod").ZodString>;
                    sortDirection: import("zod").ZodOptional<import("zod").ZodEnum<{
                        asc: "asc";
                        desc: "desc";
                    }>>;
                    filterField: import("zod").ZodOptional<import("zod").ZodString>;
                    filterValue: import("zod").ZodOptional<import("zod").ZodUnion<[import("zod").ZodUnion<[import("zod").ZodUnion<[import("zod").ZodUnion<[import("zod").ZodString, import("zod").ZodNumber]>, import("zod").ZodBoolean]>, import("zod").ZodArray<import("zod").ZodString>]>, import("zod").ZodArray<import("zod").ZodNumber>]>>;
                    filterOperator: import("zod").ZodOptional<import("zod").ZodEnum<{
                        in: "in";
                        lte: "lte";
                        eq: "eq";
                        ne: "ne";
                        lt: "lt";
                        gt: "gt";
                        gte: "gte";
                        not_in: "not_in";
                        contains: "contains";
                        starts_with: "starts_with";
                        ends_with: "ends_with";
                    }>>;
                }, import("zod/v4/core").$strip>;
                metadata: {
                    openapi: {
                        operationId: string;
                        summary: string;
                        description: string;
                        responses: {
                            200: {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            type: "object";
                                            properties: {
                                                users: {
                                                    type: string;
                                                    items: {
                                                        $ref: string;
                                                    };
                                                };
                                                total: {
                                                    type: string;
                                                };
                                                limit: {
                                                    type: string;
                                                };
                                                offset: {
                                                    type: string;
                                                };
                                            };
                                            required: string[];
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
            }, {
                users: import("better-auth/plugins").UserWithRole[];
                total: number;
            }>;
            listUserSessions: import("better-call").StrictEndpoint<"/admin/list-user-sessions", {
                method: "POST";
                use: import("better-call").Middleware<import("better-call").MiddlewareOptions, (inputContext: import("better-call").MiddlewareInputContext<import("better-call").MiddlewareOptions>) => Promise<{
                    session: {
                        user: import("better-auth/plugins").UserWithRole;
                        session: {
                            id: string;
                            createdAt: Date;
                            updatedAt: Date;
                            userId: string;
                            expiresAt: Date;
                            token: string;
                            ipAddress?: string | null | undefined;
                            userAgent?: string | null | undefined;
                        };
                    };
                }>>[];
                body: import("zod").ZodObject<{
                    userId: import("zod").ZodCoercedString<unknown>;
                }, import("zod/v4/core").$strip>;
                metadata: {
                    openapi: {
                        operationId: string;
                        summary: string;
                        description: string;
                        responses: {
                            200: {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            type: "object";
                                            properties: {
                                                sessions: {
                                                    type: string;
                                                    items: {
                                                        $ref: string;
                                                    };
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
            }, {
                sessions: import("better-auth/plugins").SessionWithImpersonatedBy[];
            }>;
            unbanUser: import("better-call").StrictEndpoint<"/admin/unban-user", {
                method: "POST";
                body: import("zod").ZodObject<{
                    userId: import("zod").ZodCoercedString<unknown>;
                }, import("zod/v4/core").$strip>;
                use: import("better-call").Middleware<import("better-call").MiddlewareOptions, (inputContext: import("better-call").MiddlewareInputContext<import("better-call").MiddlewareOptions>) => Promise<{
                    session: {
                        user: import("better-auth/plugins").UserWithRole;
                        session: {
                            id: string;
                            createdAt: Date;
                            updatedAt: Date;
                            userId: string;
                            expiresAt: Date;
                            token: string;
                            ipAddress?: string | null | undefined;
                            userAgent?: string | null | undefined;
                        };
                    };
                }>>[];
                metadata: {
                    openapi: {
                        operationId: string;
                        summary: string;
                        description: string;
                        responses: {
                            200: {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            type: "object";
                                            properties: {
                                                user: {
                                                    $ref: string;
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
            }, {
                user: import("better-auth/plugins").UserWithRole;
            }>;
            banUser: import("better-call").StrictEndpoint<"/admin/ban-user", {
                method: "POST";
                body: import("zod").ZodObject<{
                    userId: import("zod").ZodCoercedString<unknown>;
                    banReason: import("zod").ZodOptional<import("zod").ZodString>;
                    banExpiresIn: import("zod").ZodOptional<import("zod").ZodNumber>;
                }, import("zod/v4/core").$strip>;
                use: import("better-call").Middleware<import("better-call").MiddlewareOptions, (inputContext: import("better-call").MiddlewareInputContext<import("better-call").MiddlewareOptions>) => Promise<{
                    session: {
                        user: import("better-auth/plugins").UserWithRole;
                        session: {
                            id: string;
                            createdAt: Date;
                            updatedAt: Date;
                            userId: string;
                            expiresAt: Date;
                            token: string;
                            ipAddress?: string | null | undefined;
                            userAgent?: string | null | undefined;
                        };
                    };
                }>>[];
                metadata: {
                    openapi: {
                        operationId: string;
                        summary: string;
                        description: string;
                        responses: {
                            200: {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            type: "object";
                                            properties: {
                                                user: {
                                                    $ref: string;
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
            }, {
                user: import("better-auth/plugins").UserWithRole;
            }>;
            impersonateUser: import("better-call").StrictEndpoint<"/admin/impersonate-user", {
                method: "POST";
                body: import("zod").ZodObject<{
                    userId: import("zod").ZodCoercedString<unknown>;
                }, import("zod/v4/core").$strip>;
                use: import("better-call").Middleware<import("better-call").MiddlewareOptions, (inputContext: import("better-call").MiddlewareInputContext<import("better-call").MiddlewareOptions>) => Promise<{
                    session: {
                        user: import("better-auth/plugins").UserWithRole;
                        session: {
                            id: string;
                            createdAt: Date;
                            updatedAt: Date;
                            userId: string;
                            expiresAt: Date;
                            token: string;
                            ipAddress?: string | null | undefined;
                            userAgent?: string | null | undefined;
                        };
                    };
                }>>[];
                metadata: {
                    openapi: {
                        operationId: string;
                        summary: string;
                        description: string;
                        responses: {
                            200: {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            type: "object";
                                            properties: {
                                                session: {
                                                    $ref: string;
                                                };
                                                user: {
                                                    $ref: string;
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
            }, {
                session: {
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    userId: string;
                    expiresAt: Date;
                    token: string;
                    ipAddress?: string | null | undefined;
                    userAgent?: string | null | undefined;
                };
                user: import("better-auth/plugins").UserWithRole;
            }>;
            stopImpersonating: import("better-call").StrictEndpoint<"/admin/stop-impersonating", {
                method: "POST";
                requireHeaders: true;
            }, {
                session: {
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    userId: string;
                    expiresAt: Date;
                    token: string;
                    ipAddress?: string | null | undefined;
                    userAgent?: string | null | undefined;
                } & Record<string, any>;
                user: {
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    email: string;
                    emailVerified: boolean;
                    name: string;
                    image?: string | null | undefined;
                } & Record<string, any>;
            }>;
            revokeUserSession: import("better-call").StrictEndpoint<"/admin/revoke-user-session", {
                method: "POST";
                body: import("zod").ZodObject<{
                    sessionToken: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
                use: import("better-call").Middleware<import("better-call").MiddlewareOptions, (inputContext: import("better-call").MiddlewareInputContext<import("better-call").MiddlewareOptions>) => Promise<{
                    session: {
                        user: import("better-auth/plugins").UserWithRole;
                        session: {
                            id: string;
                            createdAt: Date;
                            updatedAt: Date;
                            userId: string;
                            expiresAt: Date;
                            token: string;
                            ipAddress?: string | null | undefined;
                            userAgent?: string | null | undefined;
                        };
                    };
                }>>[];
                metadata: {
                    openapi: {
                        operationId: string;
                        summary: string;
                        description: string;
                        responses: {
                            200: {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            type: "object";
                                            properties: {
                                                success: {
                                                    type: string;
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
            }, {
                success: boolean;
            }>;
            revokeUserSessions: import("better-call").StrictEndpoint<"/admin/revoke-user-sessions", {
                method: "POST";
                body: import("zod").ZodObject<{
                    userId: import("zod").ZodCoercedString<unknown>;
                }, import("zod/v4/core").$strip>;
                use: import("better-call").Middleware<import("better-call").MiddlewareOptions, (inputContext: import("better-call").MiddlewareInputContext<import("better-call").MiddlewareOptions>) => Promise<{
                    session: {
                        user: import("better-auth/plugins").UserWithRole;
                        session: {
                            id: string;
                            createdAt: Date;
                            updatedAt: Date;
                            userId: string;
                            expiresAt: Date;
                            token: string;
                            ipAddress?: string | null | undefined;
                            userAgent?: string | null | undefined;
                        };
                    };
                }>>[];
                metadata: {
                    openapi: {
                        operationId: string;
                        summary: string;
                        description: string;
                        responses: {
                            200: {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            type: "object";
                                            properties: {
                                                success: {
                                                    type: string;
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
            }, {
                success: boolean;
            }>;
            removeUser: import("better-call").StrictEndpoint<"/admin/remove-user", {
                method: "POST";
                body: import("zod").ZodObject<{
                    userId: import("zod").ZodCoercedString<unknown>;
                }, import("zod/v4/core").$strip>;
                use: import("better-call").Middleware<import("better-call").MiddlewareOptions, (inputContext: import("better-call").MiddlewareInputContext<import("better-call").MiddlewareOptions>) => Promise<{
                    session: {
                        user: import("better-auth/plugins").UserWithRole;
                        session: {
                            id: string;
                            createdAt: Date;
                            updatedAt: Date;
                            userId: string;
                            expiresAt: Date;
                            token: string;
                            ipAddress?: string | null | undefined;
                            userAgent?: string | null | undefined;
                        };
                    };
                }>>[];
                metadata: {
                    openapi: {
                        operationId: string;
                        summary: string;
                        description: string;
                        responses: {
                            200: {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            type: "object";
                                            properties: {
                                                success: {
                                                    type: string;
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
            }, {
                success: boolean;
            }>;
            setUserPassword: import("better-call").StrictEndpoint<"/admin/set-user-password", {
                method: "POST";
                body: import("zod").ZodObject<{
                    newPassword: import("zod").ZodString;
                    userId: import("zod").ZodCoercedString<unknown>;
                }, import("zod/v4/core").$strip>;
                use: import("better-call").Middleware<import("better-call").MiddlewareOptions, (inputContext: import("better-call").MiddlewareInputContext<import("better-call").MiddlewareOptions>) => Promise<{
                    session: {
                        user: import("better-auth/plugins").UserWithRole;
                        session: {
                            id: string;
                            createdAt: Date;
                            updatedAt: Date;
                            userId: string;
                            expiresAt: Date;
                            token: string;
                            ipAddress?: string | null | undefined;
                            userAgent?: string | null | undefined;
                        };
                    };
                }>>[];
                metadata: {
                    openapi: {
                        operationId: string;
                        summary: string;
                        description: string;
                        responses: {
                            200: {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            type: "object";
                                            properties: {
                                                status: {
                                                    type: string;
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
            }, {
                status: boolean;
            }>;
            userHasPermission: import("better-call").StrictEndpoint<"/admin/has-permission", {
                method: "POST";
                body: import("zod").ZodIntersection<import("zod").ZodObject<{
                    userId: import("zod").ZodOptional<import("zod").ZodCoercedString<unknown>>;
                    role: import("zod").ZodOptional<import("zod").ZodString>;
                }, import("zod/v4/core").$strip>, import("zod").ZodXor<readonly [import("zod").ZodObject<{
                    permission: import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodArray<import("zod").ZodString>>;
                }, import("zod/v4/core").$strip>, import("zod").ZodObject<{
                    permissions: import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodArray<import("zod").ZodString>>;
                }, import("zod/v4/core").$strip>]>>;
                metadata: {
                    openapi: {
                        description: string;
                        requestBody: {
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object";
                                        properties: {
                                            permissions: {
                                                type: string;
                                                description: string;
                                            };
                                        };
                                        required: string[];
                                    };
                                };
                            };
                        };
                        responses: {
                            "200": {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            type: "object";
                                            properties: {
                                                error: {
                                                    type: string;
                                                };
                                                success: {
                                                    type: string;
                                                };
                                            };
                                            required: string[];
                                        };
                                    };
                                };
                            };
                        };
                    };
                    $Infer: {
                        body: {
                            permissions: {
                                readonly user?: ("list" | "update" | "delete" | "get" | "create" | "set-role" | "ban" | "impersonate" | "impersonate-admins" | "set-password" | "set-email")[] | undefined;
                                readonly session?: ("list" | "delete" | "revoke")[] | undefined;
                            };
                        } & {
                            userId?: string | undefined;
                            role?: "admin" | "editor" | undefined;
                        };
                    };
                };
            }, {
                error: null;
                success: boolean;
            }>;
        };
        $ERROR_CODES: {
            USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: import("better-auth").RawError<"USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL">;
            FAILED_TO_CREATE_USER: import("better-auth").RawError<"FAILED_TO_CREATE_USER">;
            USER_ALREADY_EXISTS: import("better-auth").RawError<"USER_ALREADY_EXISTS">;
            YOU_CANNOT_BAN_YOURSELF: import("better-auth").RawError<"YOU_CANNOT_BAN_YOURSELF">;
            YOU_ARE_NOT_ALLOWED_TO_CHANGE_USERS_ROLE: import("better-auth").RawError<"YOU_ARE_NOT_ALLOWED_TO_CHANGE_USERS_ROLE">;
            YOU_ARE_NOT_ALLOWED_TO_CREATE_USERS: import("better-auth").RawError<"YOU_ARE_NOT_ALLOWED_TO_CREATE_USERS">;
            YOU_ARE_NOT_ALLOWED_TO_LIST_USERS: import("better-auth").RawError<"YOU_ARE_NOT_ALLOWED_TO_LIST_USERS">;
            YOU_ARE_NOT_ALLOWED_TO_LIST_USERS_SESSIONS: import("better-auth").RawError<"YOU_ARE_NOT_ALLOWED_TO_LIST_USERS_SESSIONS">;
            YOU_ARE_NOT_ALLOWED_TO_BAN_USERS: import("better-auth").RawError<"YOU_ARE_NOT_ALLOWED_TO_BAN_USERS">;
            YOU_ARE_NOT_ALLOWED_TO_IMPERSONATE_USERS: import("better-auth").RawError<"YOU_ARE_NOT_ALLOWED_TO_IMPERSONATE_USERS">;
            YOU_ARE_NOT_ALLOWED_TO_REVOKE_USERS_SESSIONS: import("better-auth").RawError<"YOU_ARE_NOT_ALLOWED_TO_REVOKE_USERS_SESSIONS">;
            YOU_ARE_NOT_ALLOWED_TO_DELETE_USERS: import("better-auth").RawError<"YOU_ARE_NOT_ALLOWED_TO_DELETE_USERS">;
            YOU_ARE_NOT_ALLOWED_TO_SET_USERS_PASSWORD: import("better-auth").RawError<"YOU_ARE_NOT_ALLOWED_TO_SET_USERS_PASSWORD">;
            BANNED_USER: import("better-auth").RawError<"BANNED_USER">;
            YOU_ARE_NOT_ALLOWED_TO_GET_USER: import("better-auth").RawError<"YOU_ARE_NOT_ALLOWED_TO_GET_USER">;
            NO_DATA_TO_UPDATE: import("better-auth").RawError<"NO_DATA_TO_UPDATE">;
            YOU_ARE_NOT_ALLOWED_TO_UPDATE_USERS: import("better-auth").RawError<"YOU_ARE_NOT_ALLOWED_TO_UPDATE_USERS">;
            YOU_CANNOT_REMOVE_YOURSELF: import("better-auth").RawError<"YOU_CANNOT_REMOVE_YOURSELF">;
            YOU_ARE_NOT_ALLOWED_TO_SET_NON_EXISTENT_VALUE: import("better-auth").RawError<"YOU_ARE_NOT_ALLOWED_TO_SET_NON_EXISTENT_VALUE">;
            YOU_CANNOT_IMPERSONATE_ADMINS: import("better-auth").RawError<"YOU_CANNOT_IMPERSONATE_ADMINS">;
            INVALID_ROLE_TYPE: import("better-auth").RawError<"INVALID_ROLE_TYPE">;
            YOU_ARE_NOT_ALLOWED_TO_SET_USERS_EMAIL: import("better-auth").RawError<"YOU_ARE_NOT_ALLOWED_TO_SET_USERS_EMAIL">;
            PASSWORD_CANNOT_BE_UPDATED_VIA_UPDATE_USER: import("better-auth").RawError<"PASSWORD_CANNOT_BE_UPDATED_VIA_UPDATE_USER">;
        };
        schema: {
            user: {
                fields: {
                    role: {
                        type: "string";
                        required: false;
                        input: false;
                    };
                    banned: {
                        type: "boolean";
                        defaultValue: false;
                        required: false;
                        input: false;
                    };
                    banReason: {
                        type: "string";
                        required: false;
                        input: false;
                    };
                    banExpires: {
                        type: "date";
                        required: false;
                        input: false;
                    };
                };
            };
            session: {
                fields: {
                    impersonatedBy: {
                        type: "string";
                        required: false;
                        input: false;
                    };
                };
            };
        };
        options: NoInfer<{
            ac: {
                newRole<const TRoleStatements extends import("better-auth/plugins").Statements>(statements: import("better-auth/plugins").RoleInput<{
                    readonly user: readonly ["create", "list", "set-role", "ban", "impersonate", "impersonate-admins", "delete", "set-password", "set-email", "get", "update"];
                    readonly session: readonly ["list", "revoke", "delete"];
                }, TRoleStatements>): import("better-auth/plugins").Role<import("better-auth/plugins").ExactRoleStatements<TRoleStatements>, {
                    readonly user: readonly ["create", "list", "set-role", "ban", "impersonate", "impersonate-admins", "delete", "set-password", "set-email", "get", "update"];
                    readonly session: readonly ["list", "revoke", "delete"];
                }>;
                statements: {
                    readonly user: readonly ["create", "list", "set-role", "ban", "impersonate", "impersonate-admins", "delete", "set-password", "set-email", "get", "update"];
                    readonly session: readonly ["list", "revoke", "delete"];
                };
            };
            roles: {
                admin: import("better-auth/plugins").Role<import("better-auth/plugins").ExactRoleStatements<{
                    readonly user: readonly ["create", "list", "set-role", "ban", "impersonate", "delete", "set-password", "set-email", "get", "update"];
                    readonly session: readonly ["list", "revoke", "delete"];
                }>, {
                    readonly user: readonly ["create", "list", "set-role", "ban", "impersonate", "impersonate-admins", "delete", "set-password", "set-email", "get", "update"];
                    readonly session: readonly ["list", "revoke", "delete"];
                }>;
                editor: import("better-auth/plugins").Role<import("better-auth/plugins").ExactRoleStatements<{}>, {
                    readonly user: readonly ["create", "list", "set-role", "ban", "impersonate", "impersonate-admins", "delete", "set-password", "set-email", "get", "update"];
                    readonly session: readonly ["list", "revoke", "delete"];
                }>;
            };
            defaultRole: string;
            adminRoles: string[];
        }>;
    }, ...{
        id: "two-factor";
        version: string;
        endpoints: {
            enableTwoFactor: import("better-call").StrictEndpoint<"/two-factor/enable", {
                method: "POST";
                body: import("zod").ZodObject<{
                    password: import("zod").ZodOptional<import("zod").ZodString>;
                    method: import("zod").ZodDefault<import("zod").ZodEnum<{
                        otp: "otp";
                        totp: "totp";
                    }>>;
                    issuer: import("zod").ZodOptional<import("zod").ZodString>;
                }, import("zod/v4/core").$strip> | import("zod").ZodObject<{
                    password: import("zod").ZodString;
                    method: import("zod").ZodDefault<import("zod").ZodEnum<{
                        otp: "otp";
                        totp: "totp";
                    }>>;
                    issuer: import("zod").ZodOptional<import("zod").ZodString>;
                }, import("zod/v4/core").$strip>;
                use: import("better-call").Middleware<import("better-call").MiddlewareOptions, (inputContext: import("better-call").MiddlewareInputContext<import("better-call").MiddlewareOptions>) => Promise<{
                    session: {
                        session: Record<string, any> & {
                            id: string;
                            createdAt: Date;
                            updatedAt: Date;
                            userId: string;
                            expiresAt: Date;
                            token: string;
                            ipAddress?: string | null | undefined;
                            userAgent?: string | null | undefined;
                        };
                        user: Record<string, any> & {
                            id: string;
                            createdAt: Date;
                            updatedAt: Date;
                            email: string;
                            emailVerified: boolean;
                            name: string;
                            image?: string | null | undefined;
                        };
                    };
                }>>[];
                metadata: {
                    openapi: {
                        summary: string;
                        description: string;
                        responses: {
                            200: {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            type: "object";
                                            properties: {
                                                method: {
                                                    type: string;
                                                    enum: string[];
                                                    description: string;
                                                };
                                                totpURI: {
                                                    type: string;
                                                    description: string;
                                                };
                                                backupCodes: {
                                                    type: string;
                                                    items: {
                                                        type: string;
                                                    };
                                                    description: string;
                                                };
                                            };
                                            required: string[];
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
            }, {
                method: "otp";
            } | {
                method: "totp";
                totpURI: string;
                backupCodes: string[];
            }>;
            disableTwoFactor: import("better-call").StrictEndpoint<"/two-factor/disable", {
                method: "POST";
                body: import("zod").ZodObject<{
                    password: import("zod").ZodOptional<import("zod").ZodString>;
                }, import("zod/v4/core").$strip> | import("zod").ZodObject<{
                    password: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
                use: import("better-call").Middleware<import("better-call").MiddlewareOptions, (inputContext: import("better-call").MiddlewareInputContext<import("better-call").MiddlewareOptions>) => Promise<{
                    session: {
                        session: Record<string, any> & {
                            id: string;
                            createdAt: Date;
                            updatedAt: Date;
                            userId: string;
                            expiresAt: Date;
                            token: string;
                            ipAddress?: string | null | undefined;
                            userAgent?: string | null | undefined;
                        };
                        user: Record<string, any> & {
                            id: string;
                            createdAt: Date;
                            updatedAt: Date;
                            email: string;
                            emailVerified: boolean;
                            name: string;
                            image?: string | null | undefined;
                        };
                    };
                }>>[];
                metadata: {
                    openapi: {
                        summary: string;
                        description: string;
                        responses: {
                            200: {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            type: "object";
                                            properties: {
                                                status: {
                                                    type: string;
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
            }, {
                status: boolean;
            }>;
            verifyBackupCode: import("better-call").StrictEndpoint<"/two-factor/verify-backup-code", {
                method: "POST";
                body: import("zod").ZodObject<{
                    code: import("zod").ZodString;
                    disableSession: import("zod").ZodOptional<import("zod").ZodBoolean>;
                    trustDevice: import("zod").ZodOptional<import("zod").ZodBoolean>;
                }, import("zod/v4/core").$strip>;
                metadata: {
                    openapi: {
                        description: string;
                        responses: {
                            "200": {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            type: "object";
                                            properties: {
                                                user: {
                                                    type: string;
                                                    properties: {
                                                        id: {
                                                            type: string;
                                                            description: string;
                                                        };
                                                        email: {
                                                            type: string;
                                                            format: string;
                                                            nullable: boolean;
                                                            description: string;
                                                        };
                                                        emailVerified: {
                                                            type: string;
                                                            nullable: boolean;
                                                            description: string;
                                                        };
                                                        name: {
                                                            type: string;
                                                            nullable: boolean;
                                                            description: string;
                                                        };
                                                        image: {
                                                            type: string;
                                                            format: string;
                                                            nullable: boolean;
                                                            description: string;
                                                        };
                                                        twoFactorEnabled: {
                                                            type: string;
                                                            description: string;
                                                        };
                                                        createdAt: {
                                                            type: string;
                                                            format: string;
                                                            description: string;
                                                        };
                                                        updatedAt: {
                                                            type: string;
                                                            format: string;
                                                            description: string;
                                                        };
                                                    };
                                                    required: string[];
                                                    description: string;
                                                };
                                                session: {
                                                    type: string;
                                                    properties: {
                                                        token: {
                                                            type: string;
                                                            description: string;
                                                        };
                                                        userId: {
                                                            type: string;
                                                            description: string;
                                                        };
                                                        createdAt: {
                                                            type: string;
                                                            format: string;
                                                            description: string;
                                                        };
                                                        expiresAt: {
                                                            type: string;
                                                            format: string;
                                                            description: string;
                                                        };
                                                    };
                                                    required: string[];
                                                    description: string;
                                                };
                                            };
                                            required: string[];
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
            }, {
                token: string | undefined;
                user: (Record<string, any> & {
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    email: string;
                    emailVerified: boolean;
                    name: string;
                    image?: string | null | undefined;
                }) | import("better-auth/plugins").UserWithTwoFactor;
            }>;
            generateBackupCodes: import("better-call").StrictEndpoint<"/two-factor/generate-backup-codes", {
                method: "POST";
                body: import("zod").ZodObject<{
                    password: import("zod").ZodOptional<import("zod").ZodString>;
                }, import("zod/v4/core").$strip> | import("zod").ZodObject<{
                    password: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
                use: import("better-call").Middleware<import("better-call").MiddlewareOptions, (inputContext: import("better-call").MiddlewareInputContext<import("better-call").MiddlewareOptions>) => Promise<{
                    session: {
                        session: Record<string, any> & {
                            id: string;
                            createdAt: Date;
                            updatedAt: Date;
                            userId: string;
                            expiresAt: Date;
                            token: string;
                            ipAddress?: string | null | undefined;
                            userAgent?: string | null | undefined;
                        };
                        user: Record<string, any> & {
                            id: string;
                            createdAt: Date;
                            updatedAt: Date;
                            email: string;
                            emailVerified: boolean;
                            name: string;
                            image?: string | null | undefined;
                        };
                    };
                }>>[];
                metadata: {
                    openapi: {
                        description: string;
                        responses: {
                            "200": {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            type: "object";
                                            properties: {
                                                status: {
                                                    type: string;
                                                    description: string;
                                                    enum: boolean[];
                                                };
                                                backupCodes: {
                                                    type: string;
                                                    items: {
                                                        type: string;
                                                    };
                                                    description: string;
                                                };
                                            };
                                            required: string[];
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
            }, {
                status: boolean;
                backupCodes: string[];
            }>;
            viewBackupCodes: import("better-call").StrictEndpoint<string, {
                method: "POST";
                body: import("zod").ZodObject<{
                    userId: import("zod").ZodCoercedString<unknown>;
                }, import("zod/v4/core").$strip>;
            }, {
                status: boolean;
                backupCodes: string[];
            }>;
            sendTwoFactorOTP: import("better-call").StrictEndpoint<"/two-factor/send-otp", {
                method: "POST";
                body: import("zod").ZodOptional<import("zod").ZodObject<{
                    trustDevice: import("zod").ZodOptional<import("zod").ZodBoolean>;
                }, import("zod/v4/core").$strip>>;
                metadata: {
                    openapi: {
                        summary: string;
                        description: string;
                        responses: {
                            200: {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            type: "object";
                                            properties: {
                                                status: {
                                                    type: string;
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
            }, {
                status: boolean;
            }>;
            verifyTwoFactorOTP: import("better-call").StrictEndpoint<"/two-factor/verify-otp", {
                method: "POST";
                body: import("zod").ZodObject<{
                    code: import("zod").ZodString;
                    trustDevice: import("zod").ZodOptional<import("zod").ZodBoolean>;
                }, import("zod/v4/core").$strip>;
                metadata: {
                    openapi: {
                        summary: string;
                        description: string;
                        responses: {
                            "200": {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            type: "object";
                                            properties: {
                                                token: {
                                                    type: string;
                                                    description: string;
                                                };
                                                user: {
                                                    type: string;
                                                    properties: {
                                                        id: {
                                                            type: string;
                                                            description: string;
                                                        };
                                                        email: {
                                                            type: string;
                                                            format: string;
                                                            nullable: boolean;
                                                            description: string;
                                                        };
                                                        emailVerified: {
                                                            type: string;
                                                            nullable: boolean;
                                                            description: string;
                                                        };
                                                        name: {
                                                            type: string;
                                                            nullable: boolean;
                                                            description: string;
                                                        };
                                                        image: {
                                                            type: string;
                                                            format: string;
                                                            nullable: boolean;
                                                            description: string;
                                                        };
                                                        createdAt: {
                                                            type: string;
                                                            format: string;
                                                            description: string;
                                                        };
                                                        updatedAt: {
                                                            type: string;
                                                            format: string;
                                                            description: string;
                                                        };
                                                    };
                                                    required: string[];
                                                    description: string;
                                                };
                                            };
                                            required: string[];
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
            }, {
                token: string;
                user: import("better-auth/plugins").UserWithTwoFactor;
            } | {
                token: string;
                user: Record<string, any> & {
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    email: string;
                    emailVerified: boolean;
                    name: string;
                    image?: string | null | undefined;
                };
            }>;
            generateTOTP: import("better-call").StrictEndpoint<string, {
                method: "POST";
                body: import("zod").ZodObject<{
                    secret: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
                metadata: {
                    openapi: {
                        summary: string;
                        description: string;
                        responses: {
                            200: {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            type: "object";
                                            properties: {
                                                code: {
                                                    type: string;
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
            }, {
                code: string;
            }>;
            getTOTPURI: import("better-call").StrictEndpoint<"/two-factor/get-totp-uri", {
                method: "POST";
                use: import("better-call").Middleware<import("better-call").MiddlewareOptions, (inputContext: import("better-call").MiddlewareInputContext<import("better-call").MiddlewareOptions>) => Promise<{
                    session: {
                        session: Record<string, any> & {
                            id: string;
                            createdAt: Date;
                            updatedAt: Date;
                            userId: string;
                            expiresAt: Date;
                            token: string;
                            ipAddress?: string | null | undefined;
                            userAgent?: string | null | undefined;
                        };
                        user: Record<string, any> & {
                            id: string;
                            createdAt: Date;
                            updatedAt: Date;
                            email: string;
                            emailVerified: boolean;
                            name: string;
                            image?: string | null | undefined;
                        };
                    };
                }>>[];
                body: import("zod").ZodObject<{
                    password: import("zod").ZodOptional<import("zod").ZodString>;
                }, import("zod/v4/core").$strip> | import("zod").ZodObject<{
                    password: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
                metadata: {
                    openapi: {
                        summary: string;
                        description: string;
                        responses: {
                            200: {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            type: "object";
                                            properties: {
                                                totpURI: {
                                                    type: string;
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
            }, {
                totpURI: string;
            }>;
            verifyTOTP: import("better-call").StrictEndpoint<"/two-factor/verify-totp", {
                method: "POST";
                body: import("zod").ZodObject<{
                    code: import("zod").ZodString;
                    trustDevice: import("zod").ZodOptional<import("zod").ZodBoolean>;
                }, import("zod/v4/core").$strip>;
                metadata: {
                    openapi: {
                        summary: string;
                        description: string;
                        responses: {
                            200: {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            type: "object";
                                            properties: {
                                                status: {
                                                    type: string;
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
            }, {
                token: string;
                user: import("better-auth/plugins").UserWithTwoFactor;
            } | {
                token: string;
                user: Record<string, any> & {
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    email: string;
                    emailVerified: boolean;
                    name: string;
                    image?: string | null | undefined;
                };
            }>;
        };
        options: NoInfer<{
            issuer: string;
        }>;
        hooks: {
            after: {
                matcher(context: import("better-auth").HookEndpointContext): boolean;
                handler: import("better-call").Middleware<import("better-call").MiddlewareOptions, (inputContext: import("better-call").MiddlewareInputContext<import("better-call").MiddlewareOptions>) => Promise<{
                    twoFactorRedirect: boolean;
                    twoFactorMethods: string[];
                } | undefined>>;
            }[];
        };
        schema: {
            user: {
                fields: {
                    twoFactorEnabled: {
                        type: "boolean";
                        required: false;
                        defaultValue: false;
                        input: false;
                    };
                };
            };
            twoFactor: {
                fields: {
                    secret: {
                        type: "string";
                        required: true;
                        returned: false;
                        index: true;
                    };
                    backupCodes: {
                        type: "string";
                        required: true;
                        returned: false;
                    };
                    userId: {
                        type: "string";
                        required: true;
                        returned: false;
                        references: {
                            model: string;
                            field: string;
                        };
                        index: true;
                    };
                    verified: {
                        type: "boolean";
                        required: false;
                        defaultValue: true;
                        input: false;
                    };
                    failedVerificationCount: {
                        type: "number";
                        required: false;
                        defaultValue: number;
                        input: false;
                        returned: false;
                    };
                    lockedUntil: {
                        type: "date";
                        required: false;
                        input: false;
                        returned: false;
                    };
                };
            };
        };
        rateLimit: {
            pathMatcher(path: string): boolean;
            window: number;
            max: number;
        }[];
        $ERROR_CODES: {
            OTP_NOT_ENABLED: import("better-auth").RawError<"OTP_NOT_ENABLED">;
            OTP_NOT_CONFIGURED: import("better-auth").RawError<"OTP_NOT_CONFIGURED">;
            OTP_HAS_EXPIRED: import("better-auth").RawError<"OTP_HAS_EXPIRED">;
            TOTP_NOT_ENABLED: import("better-auth").RawError<"TOTP_NOT_ENABLED">;
            TOTP_ALREADY_ENABLED: import("better-auth").RawError<"TOTP_ALREADY_ENABLED">;
            TOTP_NOT_CONFIGURED: import("better-auth").RawError<"TOTP_NOT_CONFIGURED">;
            TWO_FACTOR_NOT_ENABLED: import("better-auth").RawError<"TWO_FACTOR_NOT_ENABLED">;
            BACKUP_CODES_NOT_ENABLED: import("better-auth").RawError<"BACKUP_CODES_NOT_ENABLED">;
            INVALID_BACKUP_CODE: import("better-auth").RawError<"INVALID_BACKUP_CODE">;
            INVALID_CODE: import("better-auth").RawError<"INVALID_CODE">;
            TOO_MANY_ATTEMPTS_REQUEST_NEW_CODE: import("better-auth").RawError<"TOO_MANY_ATTEMPTS_REQUEST_NEW_CODE">;
            ACCOUNT_TEMPORARILY_LOCKED: import("better-auth").RawError<"ACCOUNT_TEMPORARILY_LOCKED">;
            INVALID_TWO_FACTOR_COOKIE: import("better-auth").RawError<"INVALID_TWO_FACTOR_COOKIE">;
        };
    }[]];
    socialProviders: {
        microsoft?: {
            clientId: string;
            clientSecret: string;
            tenantId: string;
        } | undefined;
        google?: {
            clientId: string;
            clientSecret: string;
        } | undefined;
        github?: {
            clientId: string;
            clientSecret: string;
        } | undefined;
    };
    databaseHooks: {
        user: {
            create: {
                before: (user: {
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    email: string;
                    emailVerified: boolean;
                    name: string;
                    image?: string | null | undefined;
                } & Record<string, unknown>) => Promise<{
                    data: {
                        role: Role;
                        id: string;
                        createdAt: Date;
                        updatedAt: Date;
                        email: string;
                        emailVerified: boolean;
                        name: string;
                        image?: string | null | undefined;
                    };
                }>;
            };
        };
    };
}>;
export type Auth = ReturnType<typeof createAuth>;
export declare function getAuth(): Promise<Auth>;
export declare function toSessionUser(user: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
    role?: string | null;
    twoFactorEnabled?: boolean | null;
}): SessionUser;
export declare function getSessionUser(headers: Headers): Promise<SessionUser | null>;
/** Whether the user can sign in with a password (only those logins ask for a second factor). */
export declare function hasPasswordLogin(userId: string): Promise<boolean>;
/** Removes the second factor of a user, e.g. after a lost phone; only for administrators. */
export declare function resetTwoFactor(userId: string): Promise<void>;
/** Available login methods, for the login page. */
export declare function authOptions(): {
    signup: boolean;
    twoFactor: "required" | "optional" | "off";
    providers: ("github" | "microsoft" | "google")[];
};
export {};
