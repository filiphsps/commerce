import { beforeEach, describe, expect, it, vi } from 'vitest';

// ------------------------------------------------------------------
// Hoisted mock fns
// ------------------------------------------------------------------

const { mockGetAuthedCmsCtx, mockNotFound } = vi.hoisted(() => ({
    mockGetAuthedCmsCtx: vi.fn(),
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

// ------------------------------------------------------------------
// Import SUT after all mocks are registered
// ------------------------------------------------------------------

import { within } from '@testing-library/react';
import { renderRSC } from '@/utils/test/rsc';
import ShopSettingsPage from './page';

// ------------------------------------------------------------------
// Fixtures
// ------------------------------------------------------------------

const ADMIN_USER = {
    id: 'user-admin-1',
    email: 'admin@example.com',
    role: 'admin' as const,
    tenants: [],
    collection: 'users' as const,
};

const EDITOR_USER = {
    id: 'user-editor-2',
    email: 'editor@example.com',
    role: 'editor' as const,
    tenants: [],
    collection: 'users' as const,
};

type AnyUser = typeof ADMIN_USER | typeof EDITOR_USER;

function makeCtx(user: AnyUser = ADMIN_USER) {
    return {
        user,
        tenant: { id: 't1', slug: 'acme', name: 'Acme' },
        session: { user: { email: user.email }, expires: '2099-01-01' },
    };
}

describe('(dashboard)/[domain]/settings/page', () => {
    const validParams = Promise.resolve({ domain: 'acme.myshopify.com' });

    beforeEach(() => {
        mockGetAuthedCmsCtx.mockReset();
        mockNotFound.mockClear();
    });

    it('is an async function (server component)', () => {
        expect(typeof ShopSettingsPage).toBe('function');
    });

    it('renders the Settings heading when authenticated as admin', async () => {
        mockGetAuthedCmsCtx.mockResolvedValue(makeCtx(ADMIN_USER));

        const { container } = await renderRSC(() => ShopSettingsPage({ params: validParams }));
        const q = within(container as HTMLElement);

        expect(q.getByText('Settings')).toBeInTheDocument();
    });

    it('renders all four cards (General + admin-only Tenants, Users, Media) when role is admin', async () => {
        mockGetAuthedCmsCtx.mockResolvedValue(makeCtx(ADMIN_USER));

        const { container } = await renderRSC(() => ShopSettingsPage({ params: validParams }));
        const q = within(container as HTMLElement);

        expect(q.getByText('General')).toBeInTheDocument();
        expect(q.getByText('Tenants')).toBeInTheDocument();
        expect(q.getByText('Users')).toBeInTheDocument();
        expect(q.getByText('Media')).toBeInTheDocument();
    });

    it('renders only the General card when role is editor', async () => {
        mockGetAuthedCmsCtx.mockResolvedValue(makeCtx(EDITOR_USER));

        const { container } = await renderRSC(() => ShopSettingsPage({ params: validParams }));
        const q = within(container as HTMLElement);

        expect(q.getByText('General')).toBeInTheDocument();
        expect(q.queryByText('Tenants')).not.toBeInTheDocument();
        expect(q.queryByText('Users')).not.toBeInTheDocument();
        expect(q.queryByText('Media')).not.toBeInTheDocument();
    });

    it('links the General card to /<domain>/settings/general/', async () => {
        mockGetAuthedCmsCtx.mockResolvedValue(makeCtx(EDITOR_USER));

        const { container } = await renderRSC(() => ShopSettingsPage({ params: validParams }));
        const q = within(container as HTMLElement);

        const generalLink = q.getByText('General').closest('div')?.querySelector('a');
        expect(generalLink?.getAttribute('href')).toMatch(/\/acme\.myshopify\.com\/settings\/general\/?$/);
    });

    it('links the Users and Media cards to their settings subpaths', async () => {
        mockGetAuthedCmsCtx.mockResolvedValue(makeCtx(ADMIN_USER));

        const { container } = await renderRSC(() => ShopSettingsPage({ params: validParams }));
        const q = within(container as HTMLElement);

        const usersLink = q.getByText('Users').closest('div')?.querySelector('a');
        expect(usersLink?.getAttribute('href')).toMatch(/\/acme\.myshopify\.com\/settings\/users\/?$/);
        const mediaLink = q.getByText('Media').closest('div')?.querySelector('a');
        expect(mediaLink?.getAttribute('href')).toMatch(/\/acme\.myshopify\.com\/settings\/media\/?$/);
    });

    it('links Tenants card to /<domain>/settings/tenants/', async () => {
        mockGetAuthedCmsCtx.mockResolvedValue(makeCtx(ADMIN_USER));

        const { container } = await renderRSC(() => ShopSettingsPage({ params: validParams }));
        const q = within(container as HTMLElement);

        const tenantsLink = q.getByText('Tenants').closest('div')?.querySelector('a');
        // Next.js normalises the href when rendering; trailing slash is present in
        // the JSX but the Link component may strip it during RSC rendering in tests.
        expect(tenantsLink?.getAttribute('href')).toMatch(/\/acme\.myshopify\.com\/settings\/tenants\/?$/);
    });

    it('exports metadata with title "Settings"', async () => {
        const { metadata } = await import('./page');
        expect((metadata as { title?: string }).title).toBe('Settings');
    });
});
