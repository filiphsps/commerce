import { describe, expect, it } from 'vitest';
import { isAdmin, type CmsUser } from './is-admin';
import { isTenantMember } from './is-tenant-member';
import { publicRead } from './public-read';

const ctx = (user: CmsUser | null) => ({ req: { user } }) as Parameters<typeof isAdmin>[0];

describe('access predicates', () => {
    it('publicRead always allows', () => {
        expect(publicRead({} as never)).toBe(true);
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
