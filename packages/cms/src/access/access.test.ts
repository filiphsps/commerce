import { describe, expect, it } from 'vitest';
import { convexCutoverLocked } from './convex-cutover-locked';
import { type CmsUser, isAdmin } from './is-admin';
import { isTenantMember } from './is-tenant-member';
import { publicRead } from './public-read';
import { publishedOrAuthRead } from './published-or-auth-read';
import { adminOnly, tenantScopedRead, tenantScopedWrite } from './tenant-scoped-read';

const ctx = (user: CmsUser | null) => ({ req: { user } }) as Parameters<typeof isAdmin>[0];

// Synthetic user shapes matching what the multi-tenant plugin populates on
// `req.user.tenants[i].tenant`. Tests below reach for these as fixtures.
const editorIn = (tenants: string[]): CmsUser => ({
    role: 'editor',
    tenants: tenants.map((id) => ({ tenant: id })) as never,
});

describe('access predicates', () => {
    it('publicRead always allows', () => {
        expect(publicRead({} as never)).toBe(true);
    });

    it('publishedOrAuthRead filters anonymous reads to published docs only', () => {
        // Autosave-enabled globals leak drafts otherwise.
        expect(publishedOrAuthRead(ctx(null))).toEqual({ _status: { equals: 'published' } });
    });

    it('publishedOrAuthRead returns true for any authenticated user', () => {
        expect(publishedOrAuthRead(ctx({ role: 'editor' }))).toBe(true);
        expect(publishedOrAuthRead(ctx({ role: 'admin' }))).toBe(true);
    });

    it('isAdmin returns true only for admin users', () => {
        expect(isAdmin(ctx({ role: 'admin' }))).toBe(true);
        expect(isAdmin(ctx({ role: 'editor' }))).toBe(false);
        expect(isAdmin(ctx(null))).toBe(false);
    });

    it('isTenantMember scopes by tenant membership', () => {
        const result = isTenantMember()(ctx({ role: 'editor', tenants: [{ tenant: 't1' }, { tenant: 't2' }] }));
        expect(result).toEqual({ tenant: { in: ['t1', 't2'] } });
    });

    it('isTenantMember returns false without a user', () => {
        expect(isTenantMember()(ctx(null))).toBe(false);
    });

    it('isTenantMember returns true for admins', () => {
        expect(isTenantMember()(ctx({ role: 'admin' }))).toBe(true);
    });

    // ---------------------------------------------------------------
    // tenantScopedRead / tenantScopedWrite / adminOnly
    //
    // These are the predicates wired on every tenant-scoped content
    // collection (pages, articles, productMetadata, collectionMetadata,
    // media, reviews). Their behavior is the multi-tenant boundary —
    // unit-test it exhaustively here so we don't need to boot Payload
    // to re-verify it end-to-end.
    // ---------------------------------------------------------------

    describe('tenantScopedRead', () => {
        it('public (no user) is restricted to published docs', () => {
            // Without this guard, autosaved drafts (every 2s) leak to anon visitors.
            expect(tenantScopedRead(ctx(null))).toEqual({ _status: { equals: 'published' } });
        });

        it('admin sees everything (unrestricted)', () => {
            expect(tenantScopedRead(ctx({ role: 'admin' }))).toBe(true);
        });

        it('editor with tenants sees only their tenants (no cross-tenant leak)', () => {
            expect(tenantScopedRead(ctx(editorIn(['t1', 't2'])))).toEqual({
                tenant: { in: ['t1', 't2'] },
            });
        });

        it('editor with no tenants sees nothing', () => {
            // Falling back to "see everything" or "see published" would silently
            // expose other tenants' content to an unscoped editor.
            expect(tenantScopedRead(ctx(editorIn([])))).toBe(false);
        });
    });

    describe('tenantScopedWrite', () => {
        it('public (no user) cannot write', () => {
            expect(tenantScopedWrite(ctx(null))).toBe(false);
        });

        it('admin can write to any tenant', () => {
            expect(tenantScopedWrite(ctx({ role: 'admin' }))).toBe(true);
        });

        it('editor can write within their tenants', () => {
            expect(tenantScopedWrite(ctx(editorIn(['t1'])))).toEqual({
                tenant: { in: ['t1'] },
            });
        });

        it('editor with no tenants cannot write', () => {
            expect(tenantScopedWrite(ctx(editorIn([])))).toBe(false);
        });
    });

    describe('adminOnly', () => {
        it('only admins pass the gate (used for delete on tenant-scoped collections)', () => {
            expect(adminOnly(ctx({ role: 'admin' }))).toBe(true);
            expect(adminOnly(ctx({ role: 'editor' }))).toBe(false);
            expect(adminOnly(ctx(null))).toBe(false);
        });
    });

    describe('convexCutoverLocked', () => {
        it('refuses EVERY caller — admins included — so no Payload write can fork a cut-over collection', () => {
            expect(convexCutoverLocked(ctx({ role: 'admin' }))).toBe(false);
            expect(convexCutoverLocked(ctx({ role: 'editor' }))).toBe(false);
            expect(convexCutoverLocked(ctx(editorIn(['t1'])))).toBe(false);
            expect(convexCutoverLocked(ctx(null))).toBe(false);
        });
    });
});
