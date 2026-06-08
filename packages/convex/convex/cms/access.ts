import type { GenericQueryCtx } from 'convex/server';
import { ConvexError } from 'convex/values';

import type { DataModel, Id } from '../_generated/dataModel';
import { resolveUserFromIdentity } from '../lib/auth';

/**
 * CMS principal role, ported from the Payload `users.role` field (`CmsUser` in
 * `@nordcom/commerce-cms`'s `access/is-admin.ts`). `admin` bypasses tenant scoping; `editor`
 * is confined to the tenants the principal collaborates on. There is no third role — a caller
 * with no resolved principal is anonymous (modeled as `null`, never a role).
 */
export type CmsRole = 'admin' | 'editor';

/**
 * Draft lifecycle state of a CMS document, the Convex analogue of Payload's `_status`. The
 * convex content tables (`tables/cms.ts`) do NOT yet carry this column (the draft/autosave port
 * is deferred), so a document with no `status` is treated as published — only an explicit
 * `'draft'` is hidden from anonymous storefront reads. See {@link isPublished}.
 */
export type CmsPublishStatus = 'draft' | 'published';

/**
 * The authenticated CMS principal: the role it acts under and the tenant ids (shop `_id`s, as
 * strings) it collaborates on. This is the Convex parity of Payload's `req.user`
 * (`{ role, tenants: [{ tenant }] }`), normalized so the pure predicates never re-walk a raw
 * relation shape — {@link resolveCmsAuthContext} does that normalization once.
 */
export type CmsPrincipal = {
    readonly role: CmsRole;
    readonly tenantIds: readonly string[];
};

/**
 * The auth/identity context every CMS access predicate decides over: a resolved
 * {@link CmsPrincipal}, or `null` for an anonymous (unauthenticated) storefront caller — the
 * parity of Payload's `req.user` being absent.
 */
export type CmsAuthContext = CmsPrincipal | null;

/**
 * The slice of a CMS document the read/write predicates inspect: its owning tenant id and its
 * draft `status`. Both optional so a partially-shaped or status-less row decides fail-closed
 * (an absent `tenant` denies tenant-member checks; an absent `status` reads as published).
 */
export type CmsDocumentRef = {
    readonly tenant?: string | null;
    readonly status?: CmsPublishStatus | null;
};

/**
 * Stable string codes carried on every {@link ConvexError} the CMS access guards throw, so call
 * sites and `convex-test` can branch on the denial cause without string-matching messages.
 * Convex functions run in the Convex isolate (not Node), where `@nordcom/commerce-errors` is off
 * the bundle surface, so a `ConvexError` payload with a stable code is the sanctioned in-runtime
 * error contract — the same pattern as `lib/auth.ts`'s `AuthErrorCode`.
 */
export const CmsAccessErrorCode = {
    /** A tenant-scoped read was denied (anonymous draft read, or editor outside their tenants). */
    READ_FORBIDDEN: 'CMS_READ_FORBIDDEN',
    /** A tenant-scoped write was denied (anonymous write, or editor outside their tenants). */
    WRITE_FORBIDDEN: 'CMS_WRITE_FORBIDDEN',
    /** An admin-only operation was attempted by a non-admin (editor or anonymous). */
    ADMIN_REQUIRED: 'CMS_ADMIN_REQUIRED',
} as const;

/**
 * Pull the tenant id out of a multi-tenant relation entry, regardless of whether the relation is
 * a raw id (`string`/`number`) or a populated document (`{ id }`). Port of `tenant-id-of.ts`'s
 * `tenantIdOf` — kept here so {@link resolveCmsAuthContext} normalizes collaborator rows the same
 * way the Payload side normalizes `user.tenants[i]`.
 *
 * @param entry - A relation entry shaped `{ tenant }`, or any non-object (yields `null`).
 * @returns The tenant id as a string, or `null` when no id can be extracted.
 */
export function tenantIdOf(entry: unknown): string | null {
    if (!entry || typeof entry !== 'object') return null;
    const t = (entry as { tenant?: unknown }).tenant;
    if (t == null) return null;
    if (typeof t === 'string') return t;
    if (typeof t === 'number') return String(t);
    if (typeof t === 'object' && 'id' in t) return String((t as { id: unknown }).id);
    return null;
}

/**
 * Collect every tenant id from a user's `tenants` relation array, tolerating both populated and
 * raw shapes via {@link tenantIdOf}. Port of `tenant-id-of.ts`'s `extractTenantIds`.
 *
 * @param user - A user-like value carrying an optional `tenants` array, or `null`/`undefined`.
 * @returns A flat array of tenant id strings; empty when the user has no tenants.
 */
export function extractTenantIds(user: { tenants?: unknown } | null | undefined): string[] {
    if (!user || !Array.isArray(user.tenants)) return [];
    return user.tenants.map(tenantIdOf).filter((id): id is string => Boolean(id));
}

/**
 * Whether the context carries an authenticated principal at all. The parity of every Payload
 * predicate's `if (!req.user)` branch — the boundary between anonymous storefront access and an
 * authenticated CMS operator.
 *
 * @param auth - The CMS auth context.
 * @returns `true` when a principal is present, `false` when anonymous.
 */
export function isAuthenticated(auth: CmsAuthContext): auth is CmsPrincipal {
    return auth !== null;
}

/**
 * Whether the principal acts under the `admin` role. Port of `is-admin.ts`'s `isAdmin`; admins
 * bypass tenant scoping in every read/write predicate below.
 *
 * @param auth - The CMS auth context.
 * @returns `true` only for an authenticated admin.
 */
export function isAdmin(auth: CmsAuthContext): boolean {
    return auth?.role === 'admin';
}

/**
 * Whether the principal acts under the `editor` role (authenticated but tenant-confined). The
 * complement of {@link isAdmin} within the two-role model.
 *
 * @param auth - The CMS auth context.
 * @returns `true` only for an authenticated editor.
 */
export function isEditor(auth: CmsAuthContext): boolean {
    return auth?.role === 'editor';
}

/**
 * Admin-only gate. Port of `tenant-scoped-read.ts`'s `adminOnly` (and `editor/access.ts`'s
 * route-level `adminOnly`): the predicate wired on `delete` for tenant-scoped content and on
 * collections editors must never mutate. A thin, intent-named alias of {@link isAdmin} so the
 * gate reads as a deliberate decision at its call sites.
 *
 * @param auth - The CMS auth context.
 * @returns `true` only for an authenticated admin.
 */
export function adminOnly(auth: CmsAuthContext): boolean {
    return isAdmin(auth);
}

/**
 * Whether the principal may act within `tenantId`. Port of `is-tenant-member.ts`'s
 * `isTenantMember` and `editor/access.ts`'s `tenantMember`: admins are members of every tenant;
 * an editor is a member only when `tenantId` is in their collaboration set; an anonymous caller
 * is never a member.
 *
 * @param auth - The CMS auth context.
 * @param tenantId - The target tenant id, or `null`/`undefined` for an unscoped document.
 * @returns `true` when the principal may act within the tenant.
 */
export function isTenantMember(auth: CmsAuthContext, tenantId: string | null | undefined): boolean {
    if (!isAuthenticated(auth)) return false;
    if (auth.role === 'admin') return true;
    if (tenantId == null) return false;
    return auth.tenantIds.includes(tenantId);
}

/**
 * Whether the principal has access to at least one tenant. Port of the "no-tenant editor sees
 * nothing" gate the Payload read/write predicates apply (`tenantIds.length === 0 → deny`): an
 * editor with no collaborations is rejected before any per-document check; admins always pass.
 *
 * @param auth - The CMS auth context.
 * @returns `true` for admins or editors with at least one tenant; `false` otherwise.
 */
export function hasAnyTenant(auth: CmsAuthContext): boolean {
    if (!isAuthenticated(auth)) return false;
    if (auth.role === 'admin') return true;
    return auth.tenantIds.length > 0;
}

/**
 * Whether a document is visible to anonymous readers. The Convex analogue of Payload's
 * `_status: 'published'` filter: only an explicit `'draft'` is hidden, so a status-less row (the
 * convex content tables carry no draft column yet) reads as published rather than vanishing from
 * the storefront.
 *
 * @param doc - The document's draft state.
 * @returns `true` unless the document is explicitly a draft.
 */
export function isPublished(doc: Pick<CmsDocumentRef, 'status'>): boolean {
    return doc.status !== 'draft';
}

/**
 * Unrestricted read predicate. Port of `public-read.ts`'s `publicRead` — always allows, for
 * collections whose content is intentionally public.
 *
 * @returns Always `true`.
 */
export function publicRead(): true {
    return true;
}

/**
 * Read predicate for draft-enabled collections. Port of `published-or-auth-read.ts`'s
 * `publishedOrAuthRead`: any authenticated principal gets the unfiltered read (tenant scoping is
 * handled elsewhere), while an anonymous caller sees only published documents so an in-flight
 * autosave cannot leak to live visitors.
 *
 * @param auth - The CMS auth context.
 * @param doc - The document's draft state.
 * @returns `true` for any authenticated principal, else whether the document is published.
 */
export function publishedOrAuthRead(auth: CmsAuthContext, doc: Pick<CmsDocumentRef, 'status'>): boolean {
    if (isAuthenticated(auth)) return true;
    return isPublished(doc);
}

/**
 * Per-document read predicate for tenant-scoped content. Port of `tenant-scoped-read.ts`'s
 * `tenantScopedRead` decomposed from a Payload where-clause into a per-row decision (the convex
 * RLS layer does the range filtering; this adds the authz verdict):
 *
 * - anonymous → only published documents;
 * - admin → every document;
 * - editor → only documents in their tenants (a no-tenant editor, or one reading another tenant's
 *   row, is denied — no cross-tenant leak).
 *
 * @param auth - The CMS auth context.
 * @param doc - The document's owning tenant and draft state.
 * @returns `true` when the principal may read this document.
 */
export function tenantScopedRead(auth: CmsAuthContext, doc: CmsDocumentRef): boolean {
    if (!isAuthenticated(auth)) return isPublished(doc);
    if (auth.role === 'admin') return true;
    return isTenantMember(auth, doc.tenant);
}

/**
 * Per-document write predicate for tenant-scoped content. Port of `tenant-scoped-read.ts`'s
 * `tenantScopedWrite`: anonymous callers and no-tenant editors are rejected, admins write to any
 * tenant, and editors write only within their own tenants.
 *
 * @param auth - The CMS auth context.
 * @param doc - The target document's owning tenant.
 * @returns `true` when the principal may write this document.
 */
export function tenantScopedWrite(auth: CmsAuthContext, doc: Pick<CmsDocumentRef, 'tenant'>): boolean {
    if (!isAuthenticated(auth)) return false;
    if (auth.role === 'admin') return true;
    return isTenantMember(auth, doc.tenant);
}

/**
 * Resolves the {@link CmsPrincipal} backing the request's trusted identity, for the active shop.
 *
 * Defense-in-depth resolver wiring the pure predicates onto real auth state: it maps the trusted
 * identity to its platform `users` row ({@link resolveUserFromIdentity}), reads that user's
 * `shopCollaborators` (`by_user`) for the tenant set, and derives the role from the active shop's
 * `permissions` (`admin` grant → `admin`, otherwise `editor`).
 *
 * Must be called with the RAW, un-RLS-wrapped ctx — the same place {@link resolveAdminShopId}
 * runs (the tenant customCtx, or the system tier). The auth `users` table is rule-less, so a
 * tenant-wrapped reader under `defaultPolicy: 'deny'` would deny the email lookup and surface a
 * spurious `UNKNOWN_USER`. The resolved principal then accompanies the pure-predicate guards ON
 * TOP OF the deny-default content db (defense in depth, not a replacement).
 *
 * @param ctx - A RAW Convex query/mutation context exposing `auth` and `db`.
 * @param shopId - The active tenant whose collaborator row determines the role.
 * @returns The resolved principal (always authenticated; throws otherwise).
 * @throws {ConvexError} `UNAUTHENTICATED` / `FORGED_IDENTITY` / `IDENTITY_WITHOUT_EMAIL` / `UNKNOWN_USER`
 *   from {@link resolveUserFromIdentity}.
 */
export async function resolveCmsAuthContext(
    ctx: Pick<GenericQueryCtx<DataModel>, 'auth' | 'db'>,
    shopId: Id<'shops'>,
): Promise<CmsPrincipal> {
    const user = await resolveUserFromIdentity(ctx);

    const collaborators = await ctx.db
        .query('shopCollaborators')
        .withIndex('by_user', (q) => q.eq('user', user._id))
        .collect();

    const tenantIds = collaborators.map((collaborator) => String(collaborator.shop));
    const active = collaborators.find((collaborator) => collaborator.shop === shopId);
    const role: CmsRole = active?.permissions.includes('admin') ? 'admin' : 'editor';

    return { role, tenantIds };
}

/**
 * Enforces {@link tenantScopedRead}, throwing on denial. The read-side composition point a CMS
 * tenant handler calls OVER the RLS deny-default — the RLS reader range-scopes rows to the active
 * shop, and this adds the role/publish authz verdict (defense in depth, not a replacement).
 *
 * @param auth - The resolved CMS auth context.
 * @param doc - The document's owning tenant and draft state.
 * @throws {ConvexError} `CMS_READ_FORBIDDEN` when the read is denied.
 */
export function assertTenantScopedRead(auth: CmsAuthContext, doc: CmsDocumentRef): void {
    if (!tenantScopedRead(auth, doc)) {
        throw new ConvexError({
            code: CmsAccessErrorCode.READ_FORBIDDEN,
            message: 'Read denied for this tenant-scoped document.',
        });
    }
}

/**
 * Enforces {@link tenantScopedWrite}, throwing on denial. The write-side companion to
 * {@link assertTenantScopedRead}, layered over the RLS-wrapped writer's deny-default.
 *
 * @param auth - The resolved CMS auth context.
 * @param doc - The target document's owning tenant.
 * @throws {ConvexError} `CMS_WRITE_FORBIDDEN` when the write is denied.
 */
export function assertTenantScopedWrite(auth: CmsAuthContext, doc: Pick<CmsDocumentRef, 'tenant'>): void {
    if (!tenantScopedWrite(auth, doc)) {
        throw new ConvexError({
            code: CmsAccessErrorCode.WRITE_FORBIDDEN,
            message: 'Write denied for this tenant-scoped document.',
        });
    }
}

/**
 * Enforces {@link adminOnly}, throwing on denial. The role gate RLS cannot express — the
 * deny-default scopes by tenant but still permits a tenant's own editor to write, so a delete or
 * admin-only mutation composes this on top to require the `admin` role.
 *
 * @param auth - The resolved CMS auth context.
 * @throws {ConvexError} `CMS_ADMIN_REQUIRED` when the principal is not an admin.
 */
export function assertAdmin(auth: CmsAuthContext): void {
    if (!adminOnly(auth)) {
        throw new ConvexError({
            code: CmsAccessErrorCode.ADMIN_REQUIRED,
            message: 'This operation requires the admin role.',
        });
    }
}
