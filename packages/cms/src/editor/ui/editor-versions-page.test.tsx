// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react';
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
vi.mock('next/navigation', () => ({
    notFound: mockNotFound,
    redirect: mockRedirect,
    useRouter: () => ({ replace: vi.fn() }),
    usePathname: () => '/a.test/content/business-data/',
    useSearchParams: () => new URLSearchParams('locale=de'),
}));

vi.mock('next/headers', () => ({ headers: async () => new Headers() }));
vi.mock('payload', () => ({
    getRequestLanguage: vi.fn(() => 'en'),
}));
vi.mock('payload/shared', () => ({ parseCookies: () => ({}) }));

import { EditorVersionsPage } from './editor-versions-page';

const manifest = defineCollectionEditor({
    collection: 'businessData',
    routes: {
        label: { singular: 'Business data', plural: 'Business data' },
        basePath: (d) => `/${d}/content/business-data/` as Route,
    },
    tenant: { kind: 'tenant-singleton', field: 'tenant' },
    access: { list: () => true, read: () => true, update: () => true },
});

const buildRuntime = (versions: Array<Record<string, unknown>>): never =>
    ({
        getCtx: async () => ({
            payload: {
                config: { collections: [{ slug: 'businessData', versions: { drafts: true } }] },
                findVersions: async () => ({ docs: versions }),
            },
            user: { id: 'u', email: 'e', role: 'editor', tenants: [{ tenant: 'tenant-1' }], collection: 'users' },
            tenant: { id: 'tenant-1', slug: 'acme', defaultLocale: 'de', locales: ['de', 'en'] },
        }),
        toAccessCtx: (_ctx: never, domain: string | null) => ({ user: null, domain }),
        DocumentForm: () => null,
        Table: () => null,
        Toolbar: () => null,
        PageHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
        buildFormState: async () => ({ state: {} }),
        getShellProps: async () => ({}),
    }) as never;

describe('<EditorVersionsPage>', () => {
    it('renders an empty state when no versions exist', async () => {
        const el = await EditorVersionsPage({
            manifest,
            runtime: buildRuntime([]),
            params: { domain: 'a.test', id: '' },
            searchParams: { locale: 'de' },
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
        const { container } = render(el);
        // Plain DOM access — no jest-dom.
        expect(container.textContent).toMatch(/no version history/i);
        expect(screen.getByRole('heading', { level: 1, name: /Versions/ })).toBeDefined();
    });

    it('renders one row per version', async () => {
        const versions = [
            { id: 'v1', updatedAt: '2026-05-15T10:00:00Z', version: { updatedBy: 'editor@test' }, latest: false },
            { id: 'v2', updatedAt: '2026-05-15T12:00:00Z', version: { updatedBy: 'admin@test' }, latest: true },
        ];
        const el = await EditorVersionsPage({
            manifest,
            runtime: buildRuntime(versions),
            params: { domain: 'a.test', id: '' },
            searchParams: { locale: 'de' },
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
        const { container } = render(el);
        expect(container.querySelectorAll('li')).toHaveLength(2);
    });

    it('redirects to tenant.defaultLocale when searchParams.locale is missing', async () => {
        await expect(
            EditorVersionsPage({
                manifest,
                runtime: buildRuntime([]),
                params: { domain: 'a.test', id: '' },
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
        ).rejects.toThrow(/NEXT_REDIRECT:.*locale=de/);
    });

    it('renders the locale switcher in the header when tenant has multiple locales', async () => {
        const el = await EditorVersionsPage({
            manifest,
            runtime: buildRuntime([]),
            params: { domain: 'a.test', id: '' },
            searchParams: { locale: 'de' },
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
        const { container } = render(el);
        expect(container.querySelector('select#locale-switcher')).not.toBeNull();
    });
});
