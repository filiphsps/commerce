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
vi.mock('@/components/shell/empty-state', () => ({
    EmptyState: vi.fn(),
}));
vi.mock('@/components/shell/page-header', () => ({
    PageHeader: vi.fn(),
}));

// Helpers imported by editor-runtime — stub at the module boundary so
// tests run without real Payload / NextAuth / Convex wiring.
vi.mock('./editor-convex-bridge', () => ({
    editorConvexBridge: {
        saveDraft: vi.fn(),
        publish: vi.fn(),
        create: vi.fn(),
        deleteDocument: vi.fn(),
        bulkDelete: vi.fn(),
        bulkPublish: vi.fn(),
        restoreVersion: vi.fn(),
        list: vi.fn(),
        getDocument: vi.fn(),
        listVersions: vi.fn(),
    },
}));
vi.mock('./payload-ctx', () => ({
    getAuthedPayloadCtx: vi.fn(),
}));

import { editorRuntime } from './editor-runtime';

describe('editorRuntime', () => {
    it('exposes the nine required handles', () => {
        expect(typeof editorRuntime.getCtx).toBe('function');
        expect(typeof editorRuntime.toAccessCtx).toBe('function');
        expect(typeof editorRuntime.buildFormState).toBe('function');
        expect(typeof editorRuntime.getShellProps).toBe('function');
        expect(typeof editorRuntime.DocumentForm).toBe('function');
        expect(typeof editorRuntime.EmptyState).toBe('function');
        expect(typeof editorRuntime.Table).toBe('function');
        expect(typeof editorRuntime.Toolbar).toBe('function');
        expect(typeof editorRuntime.PageHeader).toBe('function');
    });

    it('binds the Convex bridge with the seven write methods (CMSDATA-06) and three reads (CMSDATA-07)', () => {
        expect(editorRuntime.convex).toBeDefined();
        for (const method of [
            'saveDraft',
            'publish',
            'create',
            'deleteDocument',
            'bulkDelete',
            'bulkPublish',
            'restoreVersion',
            'list',
            'getDocument',
            'listVersions',
        ] as const) {
            expect(typeof editorRuntime.convex?.[method]).toBe('function');
        }
    });

    it('buildFormState resolves through the native CMSFORM-01 core (no Payload buildFormState)', async () => {
        const { state } = await editorRuntime.buildFormState({
            collectionSlug: 'pages',
            data: { title: 'Hello', seo: { description: 'd' }, nav: [{ label: 'Home' }] },
            operation: 'update',
            locale: 'en-US',
        });
        expect(state.title).toEqual({ value: 'Hello', initialValue: 'Hello' });
        expect(state['seo.description']?.value).toBe('d');
        expect(state['nav.0.label']?.value).toBe('Home');
    });

    it('toAccessCtx flattens user.tenants from [{tenant}] to [string]', () => {
        const accessCtx = editorRuntime.toAccessCtx(
            {
                payload: {} as never,
                user: {
                    id: 'u',
                    email: 'e',
                    role: 'editor',
                    tenants: [{ tenant: 'tenant-a' }, { tenant: 'tenant-b' }],
                    collection: 'users',
                },
                tenant: null,
            },
            'a.test',
        );
        expect(accessCtx.user?.tenants).toEqual(['tenant-a', 'tenant-b']);
        expect(accessCtx.domain).toBe('a.test');
    });

    it('toAccessCtx forwards the resolved tenant.id as tenantId', () => {
        const accessCtx = editorRuntime.toAccessCtx(
            {
                payload: {} as never,
                user: {
                    id: 'u',
                    email: 'e',
                    role: 'editor',
                    tenants: [{ tenant: 'tenant-a' }],
                    collection: 'users',
                },
                tenant: {
                    id: 'tenant-a',
                    slug: 'acme',
                    name: 'Acme',
                    defaultLocale: 'en-US',
                    locales: ['en-US'],
                },
            },
            'a.test',
        );
        expect(accessCtx.tenantId).toBe('tenant-a');
    });

    it('toAccessCtx returns tenantId: null when tenant is null (cross-tenant routes)', () => {
        const accessCtx = editorRuntime.toAccessCtx(
            {
                payload: {} as never,
                user: {
                    id: 'u',
                    email: 'e',
                    role: 'admin',
                    tenants: [],
                    collection: 'users',
                },
                tenant: null,
            },
            null,
        );
        expect(accessCtx.tenantId).toBeNull();
    });
});
