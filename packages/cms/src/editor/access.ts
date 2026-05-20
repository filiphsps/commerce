import type { EditorAccess } from './manifest';

/** Route-level gate: only admin role passes. */
export const adminOnly: EditorAccess = (ctx) => ctx.user?.role === 'admin';

/** Route-level gate: admin or editor role passes. */
export const editorOrAdmin: EditorAccess = (ctx) => ctx.user?.role === 'admin' || ctx.user?.role === 'editor';

/**
 * Route-level gate: admin role always passes; editors pass only when the
 * resolved tenantId is in `user.tenants`. Use for tenant-scoped reads.
 *
 * Both `tenantId` (from `runtime.toAccessCtx`) and `user.tenants` (from
 * `payload-ctx.ts`) carry tenant document ids, so comparing them is sound.
 * Earlier versions compared against `ctx.domain` and silently always
 * returned false for editors.
 */
export const tenantMember: EditorAccess = (ctx) => {
    if (!ctx.user) return false;
    if (ctx.user.role === 'admin') return true;
    if (ctx.tenantId === null) return false;
    return ctx.user.tenants.includes(ctx.tenantId);
};
