import { beforeEach, describe, expect, it, vi } from 'vitest';

// ------------------------------------------------------------------
// Hoisted mock fns
// ------------------------------------------------------------------

const { mockGetAuthedCmsCtx, mockList } = vi.hoisted(() => ({
    mockGetAuthedCmsCtx: vi.fn(),
    mockList: vi.fn(),
}));

// ------------------------------------------------------------------
// Mocks
// ------------------------------------------------------------------

vi.mock('server-only', () => ({}));

vi.mock('next/navigation', () => ({
    redirect: (url: string): never => {
        throw new Error(`NEXT_REDIRECT:${url}`);
    },
    notFound: (): never => {
        throw new Error('NEXT_NOT_FOUND');
    },
}));

vi.mock('@/lib/cms-ctx', () => ({
    getAuthedCmsCtx: mockGetAuthedCmsCtx,
}));

vi.mock('@/lib/editor-convex-bridge', () => ({
    editorConvexBridge: { list: mockList },
}));

// The open-by-handle form is a client component that reaches for `useRouter`; stub it so the
// server-rendered list page stays light and the test asserts the page's own behavior.
vi.mock('@/components/cms/create-metadata-for-handle-form', () => ({
    CreateMetadataForHandleForm: ({ basePath }: { basePath: string }) => (
        <div data-testid="create-metadata-form">{basePath}</div>
    ),
}));

// ------------------------------------------------------------------
// Import SUT after all mocks are registered
// ------------------------------------------------------------------

import { within } from '@testing-library/react';
import { renderRSC } from '@/utils/test/rsc';
import CollectionMetadataListPage from './page';

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

function listPage(
    docs: Array<{ documentId: string; data: Record<string, unknown>; status: string; updatedAt: number }>,
) {
    return { docs, page: 1, pageSize: 100, totalDocs: docs.length, totalPages: 1 };
}

describe('(dashboard)/[domain]/content/collection-metadata/page', () => {
    const validParams = Promise.resolve({ domain: 'acme.myshopify.com' });

    beforeEach(() => {
        mockGetAuthedCmsCtx.mockReset();
        mockList.mockReset();
    });

    it('is an async function (server component)', () => {
        expect(typeof CollectionMetadataListPage).toBe('function');
    });

    it('returns null when there is no tenant', async () => {
        mockGetAuthedCmsCtx.mockResolvedValue({ ...makeCtx(), tenant: null });

        const result = await CollectionMetadataListPage({ params: validParams });

        expect(result).toBeNull();
        expect(mockList).not.toHaveBeenCalled();
    });

    it('renders the heading and the empty-state message when no docs exist', async () => {
        mockGetAuthedCmsCtx.mockResolvedValue(makeCtx());
        mockList.mockResolvedValue(listPage([]));

        const { container } = await renderRSC(() => CollectionMetadataListPage({ params: validParams }));
        const q = within(container as HTMLElement);

        expect(q.getByText('Collection Metadata')).toBeInTheDocument();
        expect(
            q.getByText('No collection metadata yet. Enter a Shopify handle above to create the first entry.'),
        ).toBeInTheDocument();
    });

    it('lists the collectionMetadata collection with a page size of 100', async () => {
        mockGetAuthedCmsCtx.mockResolvedValue(makeCtx());
        mockList.mockResolvedValue(listPage([]));

        await renderRSC(() => CollectionMetadataListPage({ params: validParams }));

        expect(mockList).toHaveBeenCalledWith({ collection: 'collectionMetadata', pageSize: 100 });
    });

    it('renders a row per doc, labeling it by the Shopify handle', async () => {
        mockGetAuthedCmsCtx.mockResolvedValue(makeCtx());
        mockList.mockResolvedValue(
            listPage([
                { documentId: 'doc-1', data: { shopifyHandle: 'summer-sale' }, status: 'published', updatedAt: 0 },
            ]),
        );

        const { container } = await renderRSC(() => CollectionMetadataListPage({ params: validParams }));
        const q = within(container as HTMLElement);

        expect(q.getByText('summer-sale')).toBeInTheDocument();
        expect(q.getByText('published')).toBeInTheDocument();
        // Next.js may strip the trailing slash when rendering Link during RSC tests.
        const rowLink = q.getByText('summer-sale').closest('a');
        expect(rowLink?.getAttribute('href')).toMatch(
            /\/acme\.myshopify\.com\/content\/collection-metadata\/summer-sale\/?$/,
        );
    });

    it('falls back to the document id when a doc has no Shopify handle', async () => {
        mockGetAuthedCmsCtx.mockResolvedValue(makeCtx());
        mockList.mockResolvedValue(
            listPage([{ documentId: 'doc-no-handle', data: {}, status: 'draft', updatedAt: 0 }]),
        );

        const { container } = await renderRSC(() => CollectionMetadataListPage({ params: validParams }));
        const q = within(container as HTMLElement);

        expect(q.getByText('doc-no-handle')).toBeInTheDocument();
    });

    it('renders the empty state when the list rejects (defensive .catch)', async () => {
        mockGetAuthedCmsCtx.mockResolvedValue(makeCtx());
        mockList.mockRejectedValue(new Error('convex unreachable'));

        const { container } = await renderRSC(() => CollectionMetadataListPage({ params: validParams }));
        const q = within(container as HTMLElement);

        expect(q.getByText('Collection Metadata')).toBeInTheDocument();
        expect(
            q.getByText('No collection metadata yet. Enter a Shopify handle above to create the first entry.'),
        ).toBeInTheDocument();
    });

    it('exports metadata with title "Collection Metadata"', async () => {
        const { metadata } = await import('./page');
        expect((metadata as { title?: string }).title).toBe('Collection Metadata');
    });
});
