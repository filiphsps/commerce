import { describe, expect, it, vi } from 'vitest';

// ------------------------------------------------------------------
// Mock the admin components that transitively pull in @payloadcms/ui
// (and react-image-crop's CSS side-effect) — the test only needs to
// verify that the runtime wires them in as functions, not render them.
// ------------------------------------------------------------------

vi.mock('@/components/cms/collection-table', () => ({
    CollectionTable: vi.fn(),
}));
vi.mock('@/components/cms/document-form', () => ({
    DocumentForm: vi.fn(),
}));
vi.mock('@/components/cms/draft-publish-toolbar', () => ({
    DraftPublishToolbar: vi.fn(),
}));

// Helpers imported by editor-runtime — stub at the module boundary so
// tests run without real Payload / NextAuth wiring.
vi.mock('./build-cms-form-state', () => ({
    buildCmsFormState: vi.fn(),
}));
vi.mock('./get-cms-shell-props', () => ({
    getCmsShellProps: vi.fn(),
}));
vi.mock('./payload-ctx', () => ({
    getAuthedPayloadCtx: vi.fn(),
}));

import { editorRuntime } from './editor-runtime';

describe('editorRuntime', () => {
    it('exposes the seven required handles', () => {
        expect(typeof editorRuntime.getCtx).toBe('function');
        expect(typeof editorRuntime.toAccessCtx).toBe('function');
        expect(typeof editorRuntime.buildFormState).toBe('function');
        expect(typeof editorRuntime.getShellProps).toBe('function');
        expect(typeof editorRuntime.DocumentForm).toBe('function');
        expect(typeof editorRuntime.Table).toBe('function');
        expect(typeof editorRuntime.Toolbar).toBe('function');
    });

    it('toAccessCtx flattens user.tenants from [{tenant}] to [string]', () => {
        const accessCtx = editorRuntime.toAccessCtx(
            {
                payload: {} as never,
                user: {
                    id: 'u',
                    email: 'e',
                    role: 'editor',
                    tenants: [{ tenant: 'a.test' }, { tenant: 'b.test' }],
                    collection: 'users',
                },
                tenant: null,
            },
            'a.test',
        );
        expect(accessCtx.user?.tenants).toEqual(['a.test', 'b.test']);
        expect(accessCtx.domain).toBe('a.test');
    });
});
