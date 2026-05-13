import { jwtVerify } from 'jose';
import type { AuthStrategy } from 'payload';

export type CmsRoleAssignment = {
    role: 'admin' | 'editor';
    tenants: Array<{ tenant: string }>;
};

export type ComputeRolesInput = {
    email: string;
    shopCollaborators: Array<{ shopId: string }>;
    isOperator: boolean;
};

export const computeRolesFromShopMembership = ({
    shopCollaborators,
    isOperator,
}: ComputeRolesInput): CmsRoleAssignment => {
    if (isOperator) return { role: 'admin', tenants: [] };
    return { role: 'editor', tenants: shopCollaborators.map((c) => ({ tenant: c.shopId })) };
};

export type FindOrCreateUserFn = (email: string) => Promise<{
    id: string;
    email: string;
    role: 'admin' | 'editor';
    tenants: Array<{ tenant: string }>;
}>;

export type RecomputeRolesFn = (email: string) => Promise<CmsRoleAssignment>;

export type BuildNextAuthStrategyOptions = {
    secret: string;
    cookieName: string;
    findOrCreateUser: FindOrCreateUserFn;
    recomputeRoles: RecomputeRolesFn;
};

const parseCookie = (cookieHeader: string | null, name: string): string | null => {
    if (!cookieHeader) return null;
    const parts = cookieHeader.split(';');
    for (const p of parts) {
        const [k, ...v] = p.trim().split('=');
        if (k === name) return decodeURIComponent(v.join('='));
    }
    return null;
};

export const buildNextAuthStrategy = ({
    secret,
    cookieName,
    findOrCreateUser,
    recomputeRoles,
}: BuildNextAuthStrategyOptions): AuthStrategy => ({
    name: 'nextauth-bridge',
    authenticate: async ({ headers }) => {
        const cookieHeader = headers.get('cookie');
        const token = parseCookie(cookieHeader, cookieName);
        if (!token) return { user: null };
        try {
            const key = new TextEncoder().encode(secret);
            const { payload } = await jwtVerify(token, key);
            const email = typeof payload.email === 'string' ? payload.email : null;
            if (!email) return { user: null };
            const user = await findOrCreateUser(email);
            const roles = await recomputeRoles(email);
            return {
                user: { ...user, role: roles.role, tenants: roles.tenants, collection: 'users' } as never,
            };
        } catch {
            return { user: null };
        }
    },
});
