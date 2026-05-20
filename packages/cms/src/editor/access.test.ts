import { describe, expect, it } from 'vitest';
import { adminOnly, editorOrAdmin, tenantMember } from './access';
import type { EditorAccessCtx } from './manifest';

const ctxWith = (
    overrides: Partial<EditorAccessCtx['user']> | null,
    { domain = 'a.test', tenantId = 'tenant-a' }: { domain?: string | null; tenantId?: string | null } = {},
): EditorAccessCtx => ({
    user: overrides === null ? null : { id: 'u', email: 'e@e', role: 'editor', tenants: [], ...overrides },
    domain,
    tenantId,
});

describe('adminOnly', () => {
    it('returns true for admin', () => expect(adminOnly(ctxWith({ role: 'admin' }))).toBe(true));
    it('returns false for editor', () => expect(adminOnly(ctxWith({ role: 'editor' }))).toBe(false));
    it('returns false for null user', () => expect(adminOnly(ctxWith(null))).toBe(false));
});

describe('editorOrAdmin', () => {
    it('returns true for admin', () => expect(editorOrAdmin(ctxWith({ role: 'admin' }))).toBe(true));
    it('returns true for editor', () => expect(editorOrAdmin(ctxWith({ role: 'editor' }))).toBe(true));
    it('returns false for null user', () => expect(editorOrAdmin(ctxWith(null))).toBe(false));
});

describe('tenantMember', () => {
    it('returns true when tenantId is in user.tenants', () => {
        expect(tenantMember(ctxWith({ tenants: ['tenant-a', 'tenant-b'] }, { tenantId: 'tenant-a' }))).toBe(true);
    });
    it('returns true for admin even without tenant membership', () => {
        expect(tenantMember(ctxWith({ role: 'admin', tenants: [] }, { tenantId: 'tenant-a' }))).toBe(true);
    });
    it('returns false when tenantId is missing from user.tenants', () => {
        expect(tenantMember(ctxWith({ tenants: ['tenant-b'] }, { tenantId: 'tenant-a' }))).toBe(false);
    });
    it('returns false when tenantId is null and user is editor', () => {
        expect(tenantMember(ctxWith({ role: 'editor', tenants: ['tenant-a'] }, { tenantId: null }))).toBe(false);
    });
    it('returns false for null user', () => {
        expect(tenantMember(ctxWith(null, { tenantId: 'tenant-a' }))).toBe(false);
    });
    it('does NOT match by domain — tenant ids and domains are different identifiers', () => {
        // Regression guard: the old impl compared user.tenants against ctx.domain,
        // which always failed in production where user.tenants holds doc ids.
        expect(tenantMember(ctxWith({ tenants: ['a.test'] }, { domain: 'a.test', tenantId: 'tenant-a' }))).toBe(false);
    });
});
