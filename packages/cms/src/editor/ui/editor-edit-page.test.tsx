// @vitest-environment happy-dom
import { render } from '@testing-library/react';
import type { Route } from 'next';
import { describe, expect, it, vi } from 'vitest';
import { defineCollectionEditor } from '../manifest';

const { mockNotFound } = vi.hoisted(() => ({
    mockNotFound: vi.fn(() => {
        throw new Error('NEXT_NOT_FOUND');
    }),
}));
vi.mock('next/navigation', () => ({ notFound: mockNotFound }));
vi.mock('next/headers', () => ({ headers: async () => new Headers() }));
vi.mock('payload', () => ({
    createLocalReq: vi.fn(async () => ({ user: { id: 'u' }, payload: {}, i18n: {} })),
    getLocalI18n: vi.fn(async () => ({})),
    getRequestLanguage: vi.fn(() => 'en'),
}));
vi.mock('payload/shared', () => ({ parseCookies: () => ({}) }));
vi.mock('./editor-fields', () => ({ EditorFields: () => null }));
vi.mock('./editor-form-toolbar', () => ({ EditorFormToolbar: () => null }));

import { EditorEditPage } from './editor-edit-page';

const baseManifest = defineCollectionEditor({
    collection: 'businessData',
    routes: { label: { singular: 'X', plural: 'X' }, basePath: (d) => `/${d}/x/` as Route },
    tenant: { kind: 'scoped', field: 'tenant' },
    access: { list: () => true, read: () => true, update: () => true },
    revalidate: ({ domain }) => [`/${domain}/x/`],
});

const buildRuntime = (overrides: Record<string, unknown> = {}): never =>
    ({
        getCtx: async () => ({
            payload: {
                config: { collections: [], localization: false },
                find: async () => ({ docs: [{ id: 'd1', legalName: 'A' }] }),
            },
            user: { id: 'u', email: 'e', role: 'editor', tenants: [{ tenant: 'tenant-1' }], collection: 'users' },
            tenant: { id: 'tenant-1', slug: 'acme' },
        }),
        toAccessCtx: (
            ctx: { user: { id: string; email: string; role: 'admin' | 'editor'; tenants: { tenant: string }[] } },
            domain: string | null,
        ) => ({
            user: { ...ctx.user, tenants: ctx.user.tenants.map((t) => t.tenant) },
            domain,
        }),
        buildFormState: async () => ({ state: {} }),
        getShellProps: async () => ({}),
        DocumentForm: ({ title }: { title: string }) => <div data-testid="doc-form">{title}</div>,
        Table: () => null,
        Toolbar: () => null,
        ...overrides,
    }) as never;

describe('<EditorEditPage>', () => {
    it('renders DocumentForm with the manifest singular label as title when no doc.name present', async () => {
        const el = await EditorEditPage({
            manifest: baseManifest,
            runtime: buildRuntime(),
            params: { domain: 'a.test', id: 'singleton' },
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
        });
        const { getByTestId } = render(el);
        // Use plain DOM access — this package's tests don't load jest-dom.
        expect(getByTestId('doc-form').textContent).toBe('X');
    });

    it('calls notFound when access.read returns false', async () => {
        const manifest = defineCollectionEditor({
            ...baseManifest,
            access: { ...baseManifest.access, read: () => false },
        });
        await expect(
            EditorEditPage({
                manifest,
                runtime: buildRuntime(),
                params: { domain: 'a.test', id: 'singleton' },
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
        ).rejects.toThrow('NEXT_NOT_FOUND');
    });
});
