import { beforeEach, describe, expect, it, vi } from 'vitest';

// ------------------------------------------------------------------
// Hoisted mock fns
// ------------------------------------------------------------------

const { mockGetAuthedCmsCtx, mockList, mockNotFound } = vi.hoisted(() => ({
    mockGetAuthedCmsCtx: vi.fn(),
    mockList: vi.fn(),
    mockNotFound: vi.fn((): never => {
        throw new Error('NEXT_NOT_FOUND');
    }),
}));

// ------------------------------------------------------------------
// Mocks
// ------------------------------------------------------------------

vi.mock('server-only', () => ({}));

vi.mock('next/navigation', () => ({
    redirect: (url: string): never => {
        throw new Error(`NEXT_REDIRECT:${url}`);
    },
    notFound: mockNotFound,
}));

vi.mock('@/lib/cms-ctx', () => ({
    getAuthedCmsCtx: mockGetAuthedCmsCtx,
}));

vi.mock('@/lib/editor-convex-bridge', () => ({
    editorConvexBridge: { list: mockList },
}));

// ------------------------------------------------------------------
// Import SUT after all mocks are registered
// ------------------------------------------------------------------

import { within } from '@testing-library/react';
import { renderRSC } from '@/utils/test/rsc';
import ContentOverviewPage from './page';

// ------------------------------------------------------------------
// Fixtures
// ------------------------------------------------------------------

function makeCtx() {
    return {
        user: {
            id: 'user-1',
            email: 'op@example.com',
            role: 'admin' as const,
            tenants: [],
            collection: 'users' as const,
        },
        tenant: { id: 't1', slug: 'acme', name: 'Acme' },
        session: { user: { email: 'op@example.com' }, expires: '2099-01-01' },
    };
}

function listPage(docs: Array<{ documentId: string; data: Record<string, unknown> }>) {
    return { docs, page: 1, pageSize: 5, totalDocs: docs.length, totalPages: 1 };
}

/**
 * Routes `editorConvexBridge.list` to a per-collection page so each card reads its own data, and
 * any collection not named here resolves to an empty page.
 *
 * @param byCollection - Map of collection name to the resolved list page.
 * @returns A mock implementation honoring the requested collection.
 */
function listByCollection(
    byCollection: Record<string, ReturnType<typeof listPage> | Promise<never>>,
): (args: { collection: string }) => Promise<unknown> {
    return ({ collection }) => Promise.resolve(byCollection[collection] ?? listPage([]));
}

describe('(dashboard)/[domain]/content/page', () => {
    const validParams = Promise.resolve({ domain: 'acme.myshopify.com' });

    beforeEach(() => {
        mockGetAuthedCmsCtx.mockReset();
        mockList.mockReset();
        mockNotFound.mockClear();
    });

    it('is an async function (server component)', () => {
        expect(typeof ContentOverviewPage).toBe('function');
    });

    it('calls notFound when there is no tenant', async () => {
        mockGetAuthedCmsCtx.mockResolvedValue({ ...makeCtx(), tenant: null });

        await expect(ContentOverviewPage({ params: validParams })).rejects.toThrow('NEXT_NOT_FOUND');
        expect(mockNotFound).toHaveBeenCalled();
    });

    it('renders the Content heading and the global navigation cards', async () => {
        mockGetAuthedCmsCtx.mockResolvedValue(makeCtx());
        mockList.mockImplementation(listByCollection({}));

        const { container } = await renderRSC(() => ContentOverviewPage({ params: validParams }));
        const q = within(container as HTMLElement);

        expect(q.getByText('Content')).toBeInTheDocument();
        expect(q.getByText('Header')).toBeInTheDocument();
        expect(q.getByText('Footer')).toBeInTheDocument();
        // Every content singleton surfaces dynamically — `search` was previously omitted.
        expect(q.getByText('Search')).toBeInTheDocument();
        // Collection cards.
        expect(q.getByText('Pages')).toBeInTheDocument();
        expect(q.getByText('Articles')).toBeInTheDocument();
        expect(q.getByText('Product metadata')).toBeInTheDocument();
        expect(q.getByText('Collection metadata')).toBeInTheDocument();
    });

    it('renders the empty-state copy for every collection when no docs exist', async () => {
        mockGetAuthedCmsCtx.mockResolvedValue(makeCtx());
        mockList.mockImplementation(listByCollection({}));

        const { container } = await renderRSC(() => ContentOverviewPage({ params: validParams }));
        const q = within(container as HTMLElement);

        // One "No items yet." per empty collection card (pages, articles, product, collection).
        expect(q.getAllByText('No items yet.')).toHaveLength(4);
    });

    it('lists every CMS collection through editorConvexBridge.list with a page size of 5', async () => {
        mockGetAuthedCmsCtx.mockResolvedValue(makeCtx());
        mockList.mockImplementation(listByCollection({}));

        await renderRSC(() => ContentOverviewPage({ params: validParams }));

        for (const collection of ['pages', 'articles', 'productMetadata', 'collectionMetadata']) {
            expect(mockList).toHaveBeenCalledWith({ collection, pageSize: 5 });
        }
    });

    it('renders the metadata cards using the Shopify handle, not the document id', async () => {
        mockGetAuthedCmsCtx.mockResolvedValue(makeCtx());
        mockList.mockImplementation(
            listByCollection({
                productMetadata: listPage([{ documentId: 'pdoc-1', data: { shopifyHandle: 'cool-sneakers' } }]),
                collectionMetadata: listPage([{ documentId: 'cdoc-1', data: { shopifyHandle: 'summer-sale' } }]),
            }),
        );

        const { container } = await renderRSC(() => ContentOverviewPage({ params: validParams }));
        const q = within(container as HTMLElement);

        // Next.js may strip the trailing slash when rendering Link during RSC tests.
        const productLink = q.getByText('cool-sneakers').closest('a');
        expect(productLink?.getAttribute('href')).toMatch(
            /\/acme\.myshopify\.com\/content\/product-metadata\/cool-sneakers\/?$/,
        );
        const collectionLink = q.getByText('summer-sale').closest('a');
        expect(collectionLink?.getAttribute('href')).toMatch(
            /\/acme\.myshopify\.com\/content\/collection-metadata\/summer-sale\/?$/,
        );
    });

    it('derives the title from a plain-string title, a localized bucket, and the id fallback', async () => {
        mockGetAuthedCmsCtx.mockResolvedValue(makeCtx());
        mockList.mockImplementation(
            listByCollection({
                pages: listPage([
                    { documentId: 'page-string', data: { title: 'Landing Page' } },
                    { documentId: 'page-bucket', data: { title: { 'en-US': 'Bucketed Title' } } },
                    { documentId: 'page-fallback-id', data: {} },
                ]),
            }),
        );

        const { container } = await renderRSC(() => ContentOverviewPage({ params: validParams }));
        const q = within(container as HTMLElement);

        // Plain string is used verbatim.
        expect(q.getByText('Landing Page')).toBeInTheDocument();
        // Bucket-shaped title falls back to its first string slot.
        expect(q.getByText('Bucketed Title')).toBeInTheDocument();
        // Missing title falls back to the document id.
        expect(q.getByText('page-fallback-id')).toBeInTheDocument();
    });

    it('renders the page even when one collection list rejects (defensive .catch)', async () => {
        mockGetAuthedCmsCtx.mockResolvedValue(makeCtx());
        mockList.mockImplementation(
            listByCollection({
                pages: Promise.reject(new Error('convex unreachable')) as Promise<never>,
                articles: listPage([{ documentId: 'a1', data: { title: 'Blog Post' } }]),
            }),
        );

        const { container } = await renderRSC(() => ContentOverviewPage({ params: validParams }));
        const q = within(container as HTMLElement);

        // Page still renders despite the rejected `pages` list.
        expect(q.getByText('Content')).toBeInTheDocument();
        // The rejecting collection's card shows the empty state.
        expect(q.getByText('Blog Post')).toBeInTheDocument();
        // Pages card swallowed the rejection and renders empty.
        expect(q.getAllByText('No items yet.').length).toBeGreaterThanOrEqual(1);
    });

    it('exports metadata with title "Content"', async () => {
        const { metadata } = await import('./page');
        expect((metadata as { title?: string }).title).toBe('Content');
    });
});
