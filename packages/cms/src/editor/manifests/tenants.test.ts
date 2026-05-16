import { describe, expect, it } from 'vitest';
import { tenantsEditor } from './tenants';

describe('tenantsEditor', () => {
    it('targets the tenants collection', () => {
        expect(tenantsEditor.collection).toBe('tenants');
    });
    it('is shared', () => {
        expect(tenantsEditor.tenant.kind).toBe('shared');
    });
    it('admin-only', () => {
        const editorCtx = { user: { id: 'u', email: 'e', role: 'editor' as const, tenants: [] }, domain: 'a.test' };
        const adminCtx = { user: { id: 'u', email: 'e', role: 'admin' as const, tenants: [] }, domain: 'a.test' };
        expect(tenantsEditor.access.read(editorCtx)).toBe(false);
        expect(tenantsEditor.access.read(adminCtx)).toBe(true);
    });
});
