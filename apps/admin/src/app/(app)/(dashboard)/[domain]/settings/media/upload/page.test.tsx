import { beforeEach, describe, expect, it, vi } from 'vitest';

// ------------------------------------------------------------------
// Hoisted mock fns
// ------------------------------------------------------------------

const { mockGetAuthedCmsCtx, mockNotFound, mockCreateMediaAction, capturedProps } = vi.hoisted(() => ({
    mockGetAuthedCmsCtx: vi.fn(),
    mockNotFound: vi.fn((): never => {
        throw new Error('NEXT_NOT_FOUND');
    }),
    mockCreateMediaAction: vi.fn(),
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

vi.mock('@/lib/cms-actions/media-upload', () => ({
    createMediaAction: mockCreateMediaAction,
}));

vi.mock('./upload-form', () => ({
    UploadForm: (props: Record<string, unknown>) => {
        capturedProps.current = props;
        return <div data-testid="upload-form" />;
    },
}));

// ------------------------------------------------------------------
// Import SUT after all mocks are registered
// ------------------------------------------------------------------

import { within } from '@testing-library/react';
import { renderRSC } from '@/utils/test/rsc';
import UploadMediaPage from './page';

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

describe('(dashboard)/[domain]/settings/media/upload/page', () => {
    const validParams = Promise.resolve({ domain: 'acme.myshopify.com' });

    beforeEach(() => {
        mockGetAuthedCmsCtx.mockReset();
        mockNotFound.mockClear();
        mockCreateMediaAction.mockReset();
        capturedProps.current = null;
    });

    it('is an async function (server component)', () => {
        expect(typeof UploadMediaPage).toBe('function');
    });

    it('calls notFound when the operator is not an admin', async () => {
        mockGetAuthedCmsCtx.mockResolvedValue(makeCtx('editor'));

        await expect(UploadMediaPage({ params: validParams })).rejects.toThrow('NEXT_NOT_FOUND');
        expect(mockNotFound).toHaveBeenCalled();
    });

    it('renders the upload form and heading for admins', async () => {
        mockGetAuthedCmsCtx.mockResolvedValue(makeCtx('admin'));

        const { container } = await renderRSC(() => UploadMediaPage({ params: validParams }));
        const q = within(container as HTMLElement);

        expect(q.getByText('Upload media')).toBeInTheDocument();
        expect(q.getByTestId('upload-form')).toBeInTheDocument();
    });

    it('passes the domain and a bound create action to the upload form', async () => {
        mockGetAuthedCmsCtx.mockResolvedValue(makeCtx('admin'));

        await renderRSC(() => UploadMediaPage({ params: validParams }));

        expect(capturedProps.current?.domain).toBe('acme.myshopify.com');
        expect(typeof capturedProps.current?.createAction).toBe('function');
    });

    it('exports metadata with title "Upload Media"', async () => {
        const { metadata } = await import('./page');
        expect((metadata as { title?: string }).title).toBe('Upload Media');
    });
});
