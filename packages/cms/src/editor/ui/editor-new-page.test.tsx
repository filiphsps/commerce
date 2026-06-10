// @vitest-environment happy-dom
import { render } from '@testing-library/react';
import type { Route } from 'next';
import { describe, expect, it, vi } from 'vitest';
import { defineCollectionEditor } from '../manifest';

const { mockNotFound, mockRedirect } = vi.hoisted(() => ({
    mockNotFound: vi.fn(() => {
        throw new Error('NEXT_NOT_FOUND');
    }),
    mockRedirect: vi.fn((url: string) => {
        throw new Error(`NEXT_REDIRECT:${url}`);
    }),
}));
vi.mock('next/navigation', () => ({ notFound: mockNotFound, redirect: mockRedirect }));
// Mock the child component imports so the server-component page renders
// without mounting the client field surface (consistent with
// editor-edit-page.test.tsx).
vi.mock('./editor-fields', () => ({ EditorFields: () => null }));
vi.mock('./editor-form-toolbar', () => ({ EditorFormToolbar: () => null }));

import { EditorNewPage } from './editor-new-page';

const manifest = defineCollectionEditor({
    collection: 'pages',
    routes: { label: { singular: 'Page', plural: 'Pages' }, basePath: (d) => `/${d}/content/pages/` as Route },
    tenant: { kind: 'scoped', field: 'tenant' },
    access: { list: () => true, read: () => true, update: () => true, create: () => true },
});

const buildRuntime = (overrides: Record<string, unknown> = {}): never =>
    ({
        getCtx: async () => ({
            user: { id: 'u', email: 'e', role: 'editor', tenants: [{ tenant: 'tenant-1' }], collection: 'users' },
            tenant: { id: 'tenant-1', slug: 'acme', defaultLocale: 'sv', locales: ['sv', 'en'] },
        }),
        toAccessCtx: (_ctx: never, domain: string | null) => ({ user: null, domain }),
        buildFormState: async () => ({ state: {} }),
        getShellProps: async () => ({}),
        DocumentForm: ({ title }: { title: string }) => <div data-testid="doc-form">{title}</div>,
        Table: () => null,
        Toolbar: () => null,
        ...overrides,
    }) as never;

describe('<EditorNewPage>', () => {
    it('renders DocumentForm with the singular label prefixed by "New"', async () => {
        const el = await EditorNewPage({
            manifest,
            runtime: buildRuntime(),
            params: { domain: 'a.test' },
            searchParams: { locale: 'sv' },
            generatedActions: {
                saveDraft: async () => {},
                publish: async () => {},
                delete: async () => {},
                create: async () => ({ id: 'new' }),
                bulkDelete: async () => {},
                bulkPublish: async () => {},
                restoreVersion: async () => {},
            },
        });
        const { getByTestId } = render(el);
        // Plain DOM access — this package's tests don't load jest-dom.
        expect(getByTestId('doc-form').textContent).toBe('New Page');
    });

    it('redirects to tenant.defaultLocale when searchParams.locale is missing', async () => {
        await expect(
            EditorNewPage({
                manifest,
                runtime: buildRuntime(),
                params: { domain: 'a.test' },
                searchParams: {},
                generatedActions: {
                    saveDraft: async () => {},
                    publish: async () => {},
                    delete: async () => {},
                    create: async () => ({ id: 'new' }),
                    bulkDelete: async () => {},
                    bulkPublish: async () => {},
                    restoreVersion: async () => {},
                },
            }),
        ).rejects.toThrow(/NEXT_REDIRECT:.*locale=sv/);
    });

    it('calls notFound when the manifest declares no create gate', async () => {
        const readOnly = defineCollectionEditor({
            ...manifest,
            access: { list: () => true, read: () => true, update: () => true },
        });
        await expect(
            EditorNewPage({
                manifest: readOnly,
                runtime: buildRuntime(),
                params: { domain: 'a.test' },
                searchParams: { locale: 'sv' },
                generatedActions: {
                    saveDraft: async () => {},
                    publish: async () => {},
                    delete: async () => {},
                    create: async () => ({ id: 'new' }),
                    bulkDelete: async () => {},
                    bulkPublish: async () => {},
                    restoreVersion: async () => {},
                },
            }),
        ).rejects.toThrow('NEXT_NOT_FOUND');
    });
});
