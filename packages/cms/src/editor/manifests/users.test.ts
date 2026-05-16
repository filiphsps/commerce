import { describe, expect, it } from 'vitest';
import { usersEditor } from './users';

describe('usersEditor', () => {
    it('targets the users collection', () => {
        expect(usersEditor.collection).toBe('users');
    });
    it('is shared', () => {
        expect(usersEditor.tenant.kind).toBe('shared');
    });
    it('admin-only', () => {
        const editorCtx = { user: { id: 'u', email: 'e', role: 'editor' as const, tenants: [] }, domain: 'a.test' };
        const adminCtx = { user: { id: 'u', email: 'e', role: 'admin' as const, tenants: [] }, domain: 'a.test' };
        expect(usersEditor.access.read(editorCtx)).toBe(false);
        expect(usersEditor.access.read(adminCtx)).toBe(true);
    });
});
