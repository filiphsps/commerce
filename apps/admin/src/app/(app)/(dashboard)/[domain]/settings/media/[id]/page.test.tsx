import { beforeEach, describe, expect, it, vi } from 'vitest';

// ------------------------------------------------------------------
// Hoisted mock fns
// ------------------------------------------------------------------

const { mockGetAuthedCmsCtx, mockNotFound, mockGetMediaById, mockUpdateMediaMetadataAction, capturedProps } =
    vi.hoisted(() => ({
        mockGetAuthedCmsCtx: vi.fn(),
        mockNotFound: vi.fn((): never => {
            throw new Error('NEXT_NOT_FOUND');
        }),
        mockGetMediaById: vi.fn(),
        mockUpdateMediaMetadataAction: vi.fn(),
        capturedProps: { current: null as Record<string, unknown> | null },
    }));

// ------------------------------------------------------------------
// Mocks
// ------------------------------------------------------------------

vi.mock('server-only', () => ({}));

vi.mock('next/navigation', () => ({
    notFound: mockNotFound,
}));

vi.mock('@/lib/cms-ctx', () => ({
    getAuthedCmsCtx: mockGetAuthedCmsCtx,
}));

vi.mock('@/lib/editor-convex-bridge', () => ({
    getMediaById: mockGetMediaById,
}));

vi.mock('@/lib/cms-actions/media-metadata', () => ({
    updateMediaMetadataAction: mockUpdateMediaMetadataAction,
}));

vi.mock('./metadata-form', () => ({
    MediaMetadataForm: (props: Record<string, unknown>) => {
        capturedProps.current = props;
        return <div data-testid="metadata-form" />;
    },
}));

// ------------------------------------------------------------------
// Import SUT after all mocks are registered
// ------------------------------------------------------------------

import { within } from '@testing-library/react';
import { renderRSC } from '@/utils/test/rsc';
import MediaDetailPage from './page';

// ------------------------------------------------------------------
// Fixtures
// ------------------------------------------------------------------

function makeCtx(role: 'admin' | 'editor') {
    return {
        user: {
            id: 'user-1',
            email: 'op@example.com',
            role,
            tenants: [],
            collection: 'users' as const,
        },
        tenant: { id: 't1', slug: 'acme', name: 'Acme' },
        session: { user: { email: 'op@example.com' }, expires: '2099-01-01' },
    };
}

const SIZED_VARIANT = { url: 'https://cdn.example/thumb.webp', width: 100, height: 80 };

function makeImageMedia(overrides: Record<string, unknown> = {}) {
    return {
        id: 'media-1',
        alt: 'A photo',
        caption: null,
        createdAt: 1_700_000_000_000,
        url: 'https://cdn.example/original.png',
        filename: 'photo.png',
        mimeType: 'image/png',
        filesize: 2048,
        width: 1200,
        height: 900,
        focalX: null,
        focalY: null,
        sizes: { thumbnail: SIZED_VARIANT },
        ...overrides,
    };
}

describe('(dashboard)/[domain]/settings/media/[id]/page', () => {
    const validParams = Promise.resolve({ domain: 'acme.myshopify.com', id: 'media-1' });

    beforeEach(() => {
        mockGetAuthedCmsCtx.mockReset();
        mockNotFound.mockClear();
        mockGetMediaById.mockReset();
        mockUpdateMediaMetadataAction.mockReset();
        capturedProps.current = null;
    });

    it('is an async function (server component)', () => {
        expect(typeof MediaDetailPage).toBe('function');
    });

    it('calls notFound when the operator is not an admin', async () => {
        mockGetAuthedCmsCtx.mockResolvedValue(makeCtx('editor'));

        await expect(MediaDetailPage({ params: validParams })).rejects.toThrow('NEXT_NOT_FOUND');
        expect(mockNotFound).toHaveBeenCalled();
        expect(mockGetMediaById).not.toHaveBeenCalled();
    });

    it('calls notFound when the media document is missing', async () => {
        mockGetAuthedCmsCtx.mockResolvedValue(makeCtx('admin'));
        mockGetMediaById.mockResolvedValue(null);

        await expect(MediaDetailPage({ params: validParams })).rejects.toThrow('NEXT_NOT_FOUND');
        expect(mockNotFound).toHaveBeenCalled();
    });

    it('reads the media using the id from route params', async () => {
        mockGetAuthedCmsCtx.mockResolvedValue(makeCtx('admin'));
        mockGetMediaById.mockResolvedValue(makeImageMedia());

        await renderRSC(() => MediaDetailPage({ params: validParams }));

        expect(mockGetMediaById).toHaveBeenCalledWith('media-1');
    });

    it('renders image dimensions and the four derivative size rows for an image', async () => {
        mockGetAuthedCmsCtx.mockResolvedValue(makeCtx('admin'));
        mockGetMediaById.mockResolvedValue(makeImageMedia());

        const { container } = await renderRSC(() => MediaDetailPage({ params: validParams }));
        const q = within(container as HTMLElement);

        expect(q.getByText('1200 × 900')).toBeInTheDocument();
        // The four frozen derivative sizes always render.
        expect(q.getByText('thumbnail')).toBeInTheDocument();
        expect(q.getByText('card')).toBeInTheDocument();
        expect(q.getByText('feature')).toBeInTheDocument();
        expect(q.getByText('hero')).toBeInTheDocument();
    });

    it('renders sized variants as dimension links and absent ones as pending', async () => {
        mockGetAuthedCmsCtx.mockResolvedValue(makeCtx('admin'));
        mockGetMediaById.mockResolvedValue(makeImageMedia());

        const { container } = await renderRSC(() => MediaDetailPage({ params: validParams }));
        const q = within(container as HTMLElement);

        // thumbnail has a sized variant → dimension link.
        const thumbLink = q.getByText('100 × 80').closest('a');
        expect(thumbLink?.getAttribute('href')).toBe('https://cdn.example/thumb.webp');
        // card/feature/hero have no variant → three "pending" markers.
        expect(q.getAllByText('pending')).toHaveLength(3);
    });

    it('renders the image element when the asset is an image with a url', async () => {
        mockGetAuthedCmsCtx.mockResolvedValue(makeCtx('admin'));
        mockGetMediaById.mockResolvedValue(makeImageMedia());

        const { container } = await renderRSC(() => MediaDetailPage({ params: validParams }));

        const img = (container as HTMLElement).querySelector('img');
        expect(img?.getAttribute('src')).toBe('https://cdn.example/original.png');
        expect(img?.getAttribute('alt')).toBe('A photo');
    });

    it('renders an "Open original" link and no size rows for a non-image asset', async () => {
        mockGetAuthedCmsCtx.mockResolvedValue(makeCtx('admin'));
        mockGetMediaById.mockResolvedValue(
            makeImageMedia({
                mimeType: 'application/pdf',
                filename: 'spec.pdf',
                url: 'https://cdn.example/spec.pdf',
                width: null,
                height: null,
                sizes: {},
            }),
        );

        const { container } = await renderRSC(() => MediaDetailPage({ params: validParams }));
        const q = within(container as HTMLElement);

        const link = q.getByText(/Open original/).closest('a');
        expect(link?.getAttribute('href')).toBe('https://cdn.example/spec.pdf');
        // No "Generated sizes" section for non-images.
        expect(q.queryByText('thumbnail')).not.toBeInTheDocument();
    });

    it('formats the file size in bytes', async () => {
        mockGetAuthedCmsCtx.mockResolvedValue(makeCtx('admin'));
        mockGetMediaById.mockResolvedValue(makeImageMedia({ filesize: 512 }));

        const { container } = await renderRSC(() => MediaDetailPage({ params: validParams }));
        const q = within(container as HTMLElement);

        expect(q.getByText('512 B')).toBeInTheDocument();
    });

    it('formats the file size in kilobytes', async () => {
        mockGetAuthedCmsCtx.mockResolvedValue(makeCtx('admin'));
        mockGetMediaById.mockResolvedValue(makeImageMedia({ filesize: 2048 }));

        const { container } = await renderRSC(() => MediaDetailPage({ params: validParams }));
        const q = within(container as HTMLElement);

        expect(q.getByText('2.0 KB')).toBeInTheDocument();
    });

    it('formats the file size in megabytes', async () => {
        mockGetAuthedCmsCtx.mockResolvedValue(makeCtx('admin'));
        mockGetMediaById.mockResolvedValue(makeImageMedia({ filesize: 3 * 1024 * 1024 }));

        const { container } = await renderRSC(() => MediaDetailPage({ params: validParams }));
        const q = within(container as HTMLElement);

        expect(q.getByText('3.0 MB')).toBeInTheDocument();
    });

    it('renders a dash for an absent file size', async () => {
        mockGetAuthedCmsCtx.mockResolvedValue(makeCtx('admin'));
        mockGetMediaById.mockResolvedValue(makeImageMedia({ filesize: null }));

        const { container } = await renderRSC(() => MediaDetailPage({ params: validParams }));
        const q = within(container as HTMLElement);

        // Both filesize and (here) dimensions can collapse to a dash; assert at least one.
        expect(q.getAllByText('—').length).toBeGreaterThanOrEqual(1);
    });

    it('passes the media metadata and a bound update action to the form', async () => {
        mockGetAuthedCmsCtx.mockResolvedValue(makeCtx('admin'));
        mockGetMediaById.mockResolvedValue(makeImageMedia({ focalX: 0.5, focalY: 0.25 }));

        await renderRSC(() => MediaDetailPage({ params: validParams }));

        expect(capturedProps.current?.mediaId).toBe('media-1');
        expect(capturedProps.current?.alt).toBe('A photo');
        expect(capturedProps.current?.isImage).toBe(true);
        expect(capturedProps.current?.focal).toEqual({ x: 0.5, y: 0.25 });
        expect(typeof capturedProps.current?.updateAction).toBe('function');
    });

    it('exports metadata with title "Media"', async () => {
        const { metadata } = await import('./page');
        expect((metadata as { title?: string }).title).toBe('Media');
    });
});
