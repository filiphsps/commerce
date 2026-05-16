import type { EditorAccess } from './manifest';

/** Route-level gate: only admin role passes. */
export const adminOnly: EditorAccess = (ctx) => ctx.user?.role === 'admin';

/** Route-level gate: admin or editor role passes. */
export const editorOrAdmin: EditorAccess = (ctx) => ctx.user?.role === 'admin' || ctx.user?.role === 'editor';

/**
 * Route-level gate: admin role always passes; editors pass only when the
 * requested domain is in `user.tenants`. Use for tenant-scoped reads.
 */
export const tenantMember: EditorAccess = (ctx) => {
    if (!ctx.user) return false;
    if (ctx.user.role === 'admin') return true;
    if (!ctx.domain) return false;
    return ctx.user.tenants.includes(ctx.domain);
};
