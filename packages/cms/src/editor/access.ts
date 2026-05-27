import type { EditorAccess } from './manifest';

/**
 * Route-level gate that passes only when the authenticated user has the
 * `admin` role. Used alongside Payload's collection-level access for defense
 * in depth; returning `false` causes the editor route to `notFound()`.
 *
 * @param ctx - Editor access context carrying the resolved user and tenant.
 * @returns `true` when `ctx.user.role` is `'admin'`.
 *
 * @example
 * defineCollectionEditor({ access: { list: adminOnly, read: adminOnly, update: adminOnly }, ... });
 */
export const adminOnly: EditorAccess = (ctx) => ctx.user?.role === 'admin';

/**
 * Route-level gate that passes when the authenticated user holds either the
 * `admin` or `editor` role. Suitable for collections where editors should have
 * full CRUD access without requiring admin elevation.
 *
 * @param ctx - Editor access context carrying the resolved user and tenant.
 * @returns `true` when `ctx.user.role` is `'admin'` or `'editor'`.
 *
 * @example
 * defineCollectionEditor({ access: { list: editorOrAdmin, read: editorOrAdmin, update: editorOrAdmin }, ... });
 */
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
