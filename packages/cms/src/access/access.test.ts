import { describe, expect, it } from 'vitest';
import { type CmsUser, isAdmin } from './is-admin';
import { isTenantMember } from './is-tenant-member';
import { publicRead } from './public-read';
import { publishedOrAuthRead } from './published-or-auth-read';

const ctx = (user: CmsUser | null) => ({ req: { user } }) as Parameters<typeof isAdmin>[0];

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
});
