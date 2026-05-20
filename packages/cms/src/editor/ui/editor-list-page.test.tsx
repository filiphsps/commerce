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
vi.mock('next/navigation', () => ({ notFound: mockNotFound, redirect: mockRedirect }));

import { EditorListPage } from './editor-list-page';

const manifest = defineCollectionEditor({
    collection: 'pages',
    routes: { label: { singular: 'Page', plural: 'Pages' }, basePath: (d) => `/${d}/content/pages/` as Route },
    tenant: { kind: 'scoped', field: 'tenant' },
    access: { list: () => true, read: () => true, update: () => true },
    list: { columns: [{ label: 'Title', accessor: 'title' }] },
});

const buildRuntime = (): never =>
    ({
        getCtx: async () => ({
            payload: {
                config: { collections: [] },
                find: async () => ({
                    docs: [
                        { id: '1', title: 'Hello' },
                        { id: '2', title: 'World' },
                    ],
                }),
            },
            user: { id: 'u', email: 'e', role: 'editor', tenants: [{ tenant: 'tenant-1' }], collection: 'users' },
            tenant: { id: 'tenant-1', slug: 'acme', defaultLocale: 'fr', locales: ['fr', 'en'] },
        }),
        toAccessCtx: (_ctx: never, domain: string | null) => ({ user: null, domain }),
        Table: ({ rows }: { rows: Array<{ id: string }> }) => <div data-testid="table">{rows.length} rows</div>,
        EmptyState: ({
            label,
            actionHref,
            actionLabel,
        }: {
            label: string;
            actionHref?: string;
            actionLabel?: string;
        }) => (
            <div data-testid="empty-state">
                {label}
                {actionHref && actionLabel ? <a href={actionHref}>{actionLabel}</a> : null}
            </div>
        ),
        DocumentForm: () => null,
        Toolbar: () => null,
        PageHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
        buildFormState: async () => ({ state: {} }),
        getShellProps: async () => ({}),
    }) as never;

const buildEmptyRuntime = (): never =>
    ({
        ...(buildRuntime() as object),
        getCtx: async () => ({
            payload: {
                config: { collections: [] },
                find: async () => ({ docs: [] }),
            },
            user: { id: 'u', email: 'e', role: 'editor', tenants: [{ tenant: 'tenant-1' }], collection: 'users' },
            tenant: { id: 'tenant-1', slug: 'acme', defaultLocale: 'fr', locales: ['fr', 'en'] },
        }),
    }) as never;

describe('<EditorListPage>', () => {
    it('renders the runtime Table with the docs returned from payload.find', async () => {
        const el = await EditorListPage({
            manifest,
            runtime: buildRuntime(),
            params: { domain: 'a.test' },
            searchParams: { locale: 'fr' },
        });
        const { getByTestId } = render(el);
        // Plain DOM access — this package's tests don't load jest-dom.
        expect(getByTestId('table').textContent).toBe('2 rows');
        expect(screen.getByRole('heading', { level: 1, name: /Pages/ })).toBeDefined();
    });

    it('redirects to tenant.defaultLocale when searchParams.locale is missing', async () => {
        await expect(
            EditorListPage({
                manifest,
                runtime: buildRuntime(),
                params: { domain: 'a.test' },
                searchParams: {},
            }),
        ).rejects.toThrow(/NEXT_REDIRECT:.*locale=fr/);
    });

    it('renders <EmptyState> when docs are empty and manifest.list.emptyState is defined', async () => {
        const manifestWithEmpty = defineCollectionEditor({
            ...manifest,
            list: {
                columns: manifest.list?.columns ?? [],
                emptyState: { label: 'No pages yet', actionLabel: 'New page' },
            },
            access: { ...manifest.access, create: () => true },
        });
        const el = await EditorListPage({
            manifest: manifestWithEmpty,
            runtime: buildEmptyRuntime(),
            params: { domain: 'a.test' },
            searchParams: { locale: 'fr' },
        });
        const { getByTestId } = render(el);
        expect(getByTestId('empty-state').textContent).toContain('No pages yet');
        expect(getByTestId('empty-state').textContent).toContain('New page');
    });

    it('falls back to the table when docs are empty but manifest.list.emptyState is absent', async () => {
        const el = await EditorListPage({
            manifest, // no emptyState
            runtime: buildEmptyRuntime(),
            params: { domain: 'a.test' },
            searchParams: { locale: 'fr' },
        });
        const { getByTestId, queryByTestId } = render(el);
        expect(getByTestId('table').textContent).toBe('0 rows');
        expect(queryByTestId('empty-state')).toBeNull();
    });
});
