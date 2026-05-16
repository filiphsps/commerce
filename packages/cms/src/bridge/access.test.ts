import { describe, expect, it } from 'vitest';
import { adminOnly, tenantMemberCanRead } from './access';
import type { BridgeAccessCtx } from './manifest';

const ctx = (over: Partial<BridgeAccessCtx['user']> | null, domain = 'shop.test'): BridgeAccessCtx => ({
    user: over === null ? null : { id: 'u1', ...over },
    domain,
});

describe('adminOnly', () => {
    it('allows admin', async () => {
        expect(await adminOnly(ctx({ role: 'admin' }))).toBe(true);
    });
    it('denies non-admin', async () => {
        expect(await adminOnly(ctx({ role: 'editor' }))).toBe(false);
    });
    it('denies missing user', async () => {
        expect(await adminOnly(ctx(null))).toBe(false);
    });
});

describe('tenantMemberCanRead', () => {
    it('allows when user.tenants includes domain', async () => {
        expect(await tenantMemberCanRead(ctx({ tenants: ['shop.test'] }))).toBe(true);
    });
    it('allows admin regardless of tenants', async () => {
        expect(await tenantMemberCanRead(ctx({ role: 'admin' }))).toBe(true);
    });
    it('denies when domain not in user.tenants', async () => {
        expect(await tenantMemberCanRead(ctx({ tenants: ['other.test'] }))).toBe(false);
    });
    it('denies missing user', async () => {
        expect(await tenantMemberCanRead(ctx(null))).toBe(false);
    });
});
