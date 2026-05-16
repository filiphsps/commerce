import { describe, expect, it } from 'vitest';
import { adminOnly, editorOrAdmin, tenantMember } from './access';
import type { EditorAccessCtx } from './manifest';

const ctxWith = (
    overrides: Partial<EditorAccessCtx['user']> | null,
    domain: string | null = 'a.test',
): EditorAccessCtx => ({
    user: overrides === null ? null : { id: 'u', email: 'e@e', role: 'editor', tenants: [], ...overrides },
    domain,
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
    it('returns true when domain is in user.tenants', () => {
        expect(tenantMember(ctxWith({ tenants: ['a.test', 'b.test'] }, 'a.test'))).toBe(true);
    });
    it('returns true for admin even without tenant', () => {
        expect(tenantMember(ctxWith({ role: 'admin', tenants: [] }, 'a.test'))).toBe(true);
    });
    it('returns false when domain is missing from user.tenants', () => {
        expect(tenantMember(ctxWith({ tenants: ['b.test'] }, 'a.test'))).toBe(false);
    });
    it('returns false when domain is null and user is editor', () => {
        expect(tenantMember(ctxWith({ role: 'editor' }, null))).toBe(false);
    });
    it('returns false for null user', () => {
        expect(tenantMember(ctxWith(null, 'a.test'))).toBe(false);
    });
});
