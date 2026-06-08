import { makeFunctionReference } from 'convex/server';
import { ConvexError, v } from 'convex/values';
import { convexTest } from 'convex-test';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { systemMutation } from '../lib/system';
import { tenantMutation } from '../lib/tenant';
import schema from '../schema';
import {
    adminOnly,
    assertAdmin,
    assertTenantScopedRead,
    assertTenantScopedWrite,
    CmsAccessErrorCode,
    type CmsAuthContext,
    extractTenantIds,
    hasAnyTenant,
    isAdmin,
    isAuthenticated,
    isEditor,
    isPublished,
    isTenantMember,
    publicRead,
    publishedOrAuthRead,
    resolveCmsAuthContext,
    tenantIdOf,
    tenantScopedRead,
    tenantScopedWrite,
} from './access';

/**
 * Builds an authenticated editor context confined to the given tenant ids — the Convex parity of
 * a Payload `req.user` carrying `{ role: 'editor', tenants: [...] }`.
 *
 * @param tenantIds - The tenant ids the editor collaborates on.
 * @returns A non-null editor {@link CmsAuthContext}.
 */
const editor = (tenantIds: string[]): CmsAuthContext => ({ role: 'editor', tenantIds });

/** An authenticated admin context (member of every tenant). */
const admin: CmsAuthContext = { role: 'admin', tenantIds: [] };

describe('cms access predicates (parity truth tables)', () => {
    it('tenantIdOf normalizes raw, numeric, and populated relation shapes', () => {
        expect(tenantIdOf({ tenant: 't1' })).toBe('t1');
        expect(tenantIdOf({ tenant: 7 })).toBe('7');
        expect(tenantIdOf({ tenant: { id: 't2' } })).toBe('t2');
        expect(tenantIdOf({ tenant: null })).toBeNull();
        expect(tenantIdOf(null)).toBeNull();
        expect(tenantIdOf('nope')).toBeNull();
    });

    it('extractTenantIds collects ids and drops unresolvable entries', () => {
        expect(extractTenantIds({ tenants: [{ tenant: 't1' }, { tenant: { id: 't2' } }, { tenant: null }] })).toEqual([
            't1',
            't2',
        ]);
        expect(extractTenantIds(null)).toEqual([]);
        expect(extractTenantIds({})).toEqual([]);
    });

    it('isAuthenticated distinguishes a principal from anonymous', () => {
        expect(isAuthenticated(admin)).toBe(true);
        expect(isAuthenticated(editor(['t1']))).toBe(true);
        expect(isAuthenticated(null)).toBe(false);
    });

    it('isAdmin is true only for the admin role', () => {
        expect(isAdmin(admin)).toBe(true);
        expect(isAdmin(editor(['t1']))).toBe(false);
        expect(isAdmin(null)).toBe(false);
    });

    it('isEditor is true only for the editor role', () => {
        expect(isEditor(editor(['t1']))).toBe(true);
        expect(isEditor(admin)).toBe(false);
        expect(isEditor(null)).toBe(false);
    });

    it('adminOnly gates to admins', () => {
        expect(adminOnly(admin)).toBe(true);
        expect(adminOnly(editor(['t1']))).toBe(false);
        expect(adminOnly(null)).toBe(false);
    });

    it('isTenantMember: admins are members of every tenant; editors only of their own', () => {
        expect(isTenantMember(admin, 't1')).toBe(true);
        expect(isTenantMember(editor(['t1', 't2']), 't1')).toBe(true);
        expect(isTenantMember(editor(['t1']), 't2')).toBe(false);
        expect(isTenantMember(editor(['t1']), null)).toBe(false);
        expect(isTenantMember(null, 't1')).toBe(false);
    });

    it('hasAnyTenant: admins always; editors only with a tenant', () => {
        expect(hasAnyTenant(admin)).toBe(true);
        expect(hasAnyTenant(editor(['t1']))).toBe(true);
        expect(hasAnyTenant(editor([]))).toBe(false);
        expect(hasAnyTenant(null)).toBe(false);
    });

    it('isPublished hides only explicit drafts (status-less rows read as published)', () => {
        expect(isPublished({ status: 'published' })).toBe(true);
        expect(isPublished({})).toBe(true);
        expect(isPublished({ status: 'draft' })).toBe(false);
    });

    it('publicRead always allows', () => {
        expect(publicRead()).toBe(true);
    });

    it('publishedOrAuthRead: auth sees all; anon sees only published', () => {
        expect(publishedOrAuthRead(admin, { status: 'draft' })).toBe(true);
        expect(publishedOrAuthRead(editor(['t1']), { status: 'draft' })).toBe(true);
        expect(publishedOrAuthRead(null, { status: 'published' })).toBe(true);
        expect(publishedOrAuthRead(null, { status: 'draft' })).toBe(false);
    });

    describe('tenantScopedRead', () => {
        it('anonymous is restricted to published documents', () => {
            expect(tenantScopedRead(null, { tenant: 't1', status: 'published' })).toBe(true);
            expect(tenantScopedRead(null, { tenant: 't1', status: 'draft' })).toBe(false);
        });

        it('admin reads everything', () => {
            expect(tenantScopedRead(admin, { tenant: 't9', status: 'draft' })).toBe(true);
        });

        it('editor reads only their own tenants (no cross-tenant leak)', () => {
            expect(tenantScopedRead(editor(['t1', 't2']), { tenant: 't1', status: 'draft' })).toBe(true);
            expect(tenantScopedRead(editor(['t1']), { tenant: 't2', status: 'published' })).toBe(false);
        });

        it('a no-tenant editor reads nothing', () => {
            expect(tenantScopedRead(editor([]), { tenant: 't1', status: 'published' })).toBe(false);
        });
    });

    describe('tenantScopedWrite', () => {
        it('anonymous cannot write', () => {
            expect(tenantScopedWrite(null, { tenant: 't1' })).toBe(false);
        });

        it('admin writes any tenant', () => {
            expect(tenantScopedWrite(admin, { tenant: 't9' })).toBe(true);
        });

        it('editor writes only within their tenants', () => {
            expect(tenantScopedWrite(editor(['t1']), { tenant: 't1' })).toBe(true);
            expect(tenantScopedWrite(editor(['t1']), { tenant: 't2' })).toBe(false);
        });

        it('a no-tenant editor cannot write', () => {
            expect(tenantScopedWrite(editor([]), { tenant: 't1' })).toBe(false);
        });
    });
});

describe('cms access guards (throwing enforcement)', () => {
    it('assertTenantScopedRead throws CMS_READ_FORBIDDEN for a non-member editor', () => {
        expect(() => assertTenantScopedRead(editor(['t1']), { tenant: 't2', status: 'published' })).toThrow(
            ConvexError,
        );
        try {
            assertTenantScopedRead(editor(['t1']), { tenant: 't2', status: 'published' });
        } catch (error) {
            expect((error as ConvexError<{ code: string }>).data.code).toBe(CmsAccessErrorCode.READ_FORBIDDEN);
        }
    });

    it('assertTenantScopedWrite throws CMS_WRITE_FORBIDDEN for a non-member editor', () => {
        try {
            assertTenantScopedWrite(editor(['t1']), { tenant: 't2' });
            throw new TypeError('expected a denial');
        } catch (error) {
            expect((error as ConvexError<{ code: string }>).data.code).toBe(CmsAccessErrorCode.WRITE_FORBIDDEN);
        }
    });

    it('assertAdmin throws CMS_ADMIN_REQUIRED for an editor and passes for an admin', () => {
        try {
            assertAdmin(editor(['t1']));
            throw new TypeError('expected a denial');
        } catch (error) {
            expect((error as ConvexError<{ code: string }>).data.code).toBe(CmsAccessErrorCode.ADMIN_REQUIRED);
        }
        expect(() => assertAdmin(admin)).not.toThrow();
    });
});

/**
 * The trusted NextAuth issuer the tenant constructors assert against (via `resolveAdminShopId`).
 * Stubbed for every wiring case so the issuer check is active under `convex-test`, whose
 * `withIdentity` fakes identities WITHOUT Convex's real signature/issuer validation.
 */
const TRUSTED_ISSUER = 'https://admin.test.nordcom.io';

/** Fixed epoch-ms stamp for seeded rows' managed timestamps; its value is irrelevant to the assertions. */
const NOW = 1_700_000_000_000;

/**
 * Seeds two isolated operators through the system tier's raw db: an admin collaborator on shop A
 * (permissions `['admin']`) and an editor collaborator on shop B (permissions `[]`). Returns both
 * shop ids so the wiring tests can name a foreign tenant the editor is not a member of.
 *
 * @returns The seeded shop ids keyed by operator role.
 */
const seedOperators = systemMutation({
    args: { adminEmail: v.string(), editorEmail: v.string() },
    handler: async (ctx, { adminEmail, editorEmail }) => {
        /**
         * Inserts one operator user, one shop, and a collaborator row granting the given permissions.
         *
         * @param email - The operator's identity email claim.
         * @param legacyId - The shop's legacy id and display-name seed.
         * @param domain - The shop's primary domain.
         * @param permissions - The collaboration permissions (drives the resolved CMS role).
         * @returns The created shop id.
         */
        const seed = async (email: string, legacyId: string, domain: string, permissions: string[]) => {
            const userId = await ctx.db.insert('users', {
                email,
                name: 'Operator',
                emailVerified: null,
                identities: [],
                createdAt: NOW,
                updatedAt: NOW,
            });
            const shopId = await ctx.db.insert('shops', {
                legacyId,
                name: legacyId,
                domain,
                design: {
                    header: { logo: { width: 512, height: 512, src: 'https://cdn/logo.png', alt: legacyId } },
                    accents: [],
                },
                commerceProvider: { type: 'stripe', authentication: {} },
                createdAt: NOW,
                updatedAt: NOW,
            });
            await ctx.db.insert('shopCollaborators', { shop: shopId, user: userId, permissions });
            return shopId;
        };

        const shopAId = await seed(adminEmail, 'shop_a', 'a.example.com', ['admin']);
        const shopBId = await seed(editorEmail, 'shop_b', 'b.example.com', []);
        return { shopAId, shopBId };
    },
});

/**
 * Validator for a pre-resolved {@link CmsPrincipal} passed into a tenant-wrapper fixture. In
 * production the tenant customCtx would pin the principal (resolved server-side via
 * {@link resolveCmsAuthContext}); the fixtures accept it as an arg only because wiring the customCtx
 * itself lives in `lib/tenant.ts`, outside this task's edit scope.
 */
const principalValidator = v.object({
    role: v.union(v.literal('admin'), v.literal('editor')),
    tenantIds: v.array(v.string()),
});

/**
 * A {@link tenantMutation} fixture composing the CMS write guard OVER the deny-default RLS writer in
 * a single handler: {@link assertTenantScopedWrite} runs the role/membership authz first, then the
 * RLS-wrapped `ctx.db` confines the actual insert to `ctx.shopId`. A denial throws before any write.
 */
const guardedWriteFixture = tenantMutation({
    args: { principal: principalValidator, targetTenant: v.string() },
    handler: async (ctx, { principal, targetTenant }) => {
        assertTenantScopedWrite(principal, { tenant: targetTenant });
        return ctx.db.insert('reviews', { shopId: ctx.shopId, createdAt: NOW, updatedAt: NOW });
    },
});

/**
 * Hand-built module map for `convex-test` (see `lib/tenant.test.ts` for the rationale): Biome forbids
 * exporting fixtures from a test file and the default glob excludes the self-importing module, so the
 * fixtures resolve by `FunctionReference` against this module's path.
 */
const modules = {
    '/convex/_generated/server.js': () => Promise.resolve({}),
    '/convex/cms/access.test.ts': () => Promise.resolve({ seedOperators, guardedWriteFixture }),
};

const seedOperatorsRef = makeFunctionReference<'mutation'>('cms/access.test:seedOperators');
const guardedWriteRef = makeFunctionReference<'mutation'>('cms/access.test:guardedWriteFixture');

const asOperator = (t: ReturnType<typeof convexTest>, email: string, subject: string) =>
    t.withIdentity({ issuer: TRUSTED_ISSUER, subject, email });

describe('cms access wiring over the tenant deny-default', () => {
    beforeEach(() => {
        vi.stubEnv('CONVEX_AUTH_ISSUER', TRUSTED_ISSUER);
    });
    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('resolveCmsAuthContext derives the active-shop role from collaborator permissions over the raw ctx', async () => {
        const t = convexTest(schema, modules);
        const { shopAId, shopBId } = await t.mutation(seedOperatorsRef, {
            adminEmail: 'admin@example.com',
            editorEmail: 'editor@example.com',
        });

        // `.run` exposes the RAW (un-RLS-wrapped) ctx — the same surface the tenant customCtx resolves on.
        const adminCtx = await asOperator(t, 'admin@example.com', 'github|admin').run((ctx) =>
            resolveCmsAuthContext(ctx, shopAId),
        );
        const editorCtx = await asOperator(t, 'editor@example.com', 'github|editor').run((ctx) =>
            resolveCmsAuthContext(ctx, shopBId),
        );

        expect(adminCtx).toEqual({ role: 'admin', tenantIds: [shopAId] });
        expect(editorCtx).toEqual({ role: 'editor', tenantIds: [shopBId] });
    });

    it('composes the write guard over the deny-default writer: admin write lands, editor non-member write is denied', async () => {
        const t = convexTest(schema, modules);
        const { shopAId, shopBId } = await t.mutation(seedOperatorsRef, {
            adminEmail: 'admin@example.com',
            editorEmail: 'editor@example.com',
        });

        const adminPrincipal = await asOperator(t, 'admin@example.com', 'github|admin').run((ctx) =>
            resolveCmsAuthContext(ctx, shopAId),
        );
        const editorPrincipal = await asOperator(t, 'editor@example.com', 'github|editor').run((ctx) =>
            resolveCmsAuthContext(ctx, shopBId),
        );

        // Admin operator (resolved to shop A) writes its own tenant — guard passes, RLS allows.
        await expect(
            asOperator(t, 'admin@example.com', 'github|admin').mutation(guardedWriteRef, {
                principal: adminPrincipal,
                targetTenant: shopAId,
            }),
        ).resolves.toBeDefined();

        // Editor operator (member of shop B only) targets shop A — the guard denies before the writer runs.
        await expect(
            asOperator(t, 'editor@example.com', 'github|editor').mutation(guardedWriteRef, {
                principal: editorPrincipal,
                targetTenant: shopAId,
            }),
        ).rejects.toThrow(CmsAccessErrorCode.WRITE_FORBIDDEN);
    });
});
