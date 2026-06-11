// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react';
import type { Route } from 'next';
import { describe, expect, it, vi } from 'vitest';
import { defineCollectionEditor } from '../manifest';
import type { EditorCmsDocument, EditorCmsListPage } from '../runtime';

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

/**
 * Build a bridge document row for the list mock.
 *
 * @param documentId - The live id.
 * @param title - The serialized `title` field.
 * @returns The bridge document.
 */
const doc = (documentId: string, title: string): EditorCmsDocument => ({
    documentId,
    collection: 'pages',
    data: { title },
    status: 'draft',
    updatedAt: 1_700_000_000_000,
});

/**
 * Build the runtime substrate with a Convex bridge whose `list` resolves (or
 * rejects with) the given outcome.
 *
 * @param list - The bridge `list` implementation for this scenario.
 * @returns The runtime, typed loosely for the page under test.
 */
const buildRuntime = (list: () => Promise<EditorCmsListPage>): never =>
    ({
        getCtx: async () => ({
            user: { id: 'u', email: 'e', role: 'editor', tenants: [{ tenant: 'tenant-1' }], collection: 'users' },
            tenant: { id: 'tenant-1', slug: 'acme', defaultLocale: 'fr', locales: ['fr', 'en'] },
        }),
        toAccessCtx: (_ctx: never, domain: string | null) => ({ user: null, domain }),
        convex: { list },
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
    }) as never;

const onePage = (docs: EditorCmsDocument[]): EditorCmsListPage => ({
    docs,
    page: 1,
    pageSize: 25,
    totalDocs: docs.length,
    totalPages: 1,
});

describe('<EditorListPage>', () => {
    it('renders the runtime Table with the docs returned from the Convex bounded list', async () => {
        const el = await EditorListPage({
            manifest,
            runtime: buildRuntime(async () => onePage([doc('1', 'Hello'), doc('2', 'World')])),
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
                runtime: buildRuntime(async () => onePage([])),
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
            runtime: buildRuntime(async () => onePage([])),
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
            runtime: buildRuntime(async () => onePage([])),
            params: { domain: 'a.test' },
            searchParams: { locale: 'fr' },
        });
        const { getByTestId, queryByTestId } = render(el);
        expect(getByTestId('table').textContent).toBe('0 rows');
        expect(queryByTestId('empty-state')).toBeNull();
    });

    it('refuses an out-of-range page with notFound (typed CMS_LIST_PAGE_OUT_OF_RANGE)', async () => {
        await expect(
            EditorListPage({
                manifest,
                runtime: buildRuntime(async () => {
                    throw Object.assign(new TypeError('page out of range'), {
                        data: { code: 'CMS_LIST_PAGE_OUT_OF_RANGE' },
                    });
                }),
                params: { domain: 'a.test' },
                searchParams: { locale: 'fr', page: '99' },
            }),
        ).rejects.toThrow('NEXT_NOT_FOUND');
    });

    it('surfaces a friendly bounded-list notice on CMS_BOUNDED_SCAN_EXCEEDED instead of crashing', async () => {
        const el = await EditorListPage({
            manifest,
            runtime: buildRuntime(async () => {
                throw Object.assign(new TypeError('scan exceeded'), {
                    data: { code: 'CMS_BOUNDED_SCAN_EXCEEDED' },
                });
            }),
            params: { domain: 'a.test' },
            searchParams: { locale: 'fr' },
        });
        const { getByTestId, queryByTestId } = render(el);
        expect(getByTestId('bounded-list-notice').textContent).toContain('too large to list');
        expect(queryByTestId('table')).toBeNull();
    });

    it('rethrows bridge errors without a recognized code', async () => {
        await expect(
            EditorListPage({
                manifest,
                runtime: buildRuntime(async () => {
                    throw new Error('boom');
                }),
                params: { domain: 'a.test' },
                searchParams: { locale: 'fr' },
            }),
        ).rejects.toThrow('boom');
    });
});
