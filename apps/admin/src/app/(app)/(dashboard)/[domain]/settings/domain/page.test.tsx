import { beforeEach, describe, expect, it, vi } from 'vitest';

// ------------------------------------------------------------------
// Hoisted mock fns
// ------------------------------------------------------------------

const { mockGetDomainVerification, mockGetVercelConfig, mockBuildRecordInstructions, mockVerifyDomain, capturedProps } =
    vi.hoisted(() => ({
        mockGetDomainVerification: vi.fn(),
        mockGetVercelConfig: vi.fn(),
        mockBuildRecordInstructions: vi.fn(),
        mockVerifyDomain: vi.fn(),
        capturedProps: { current: null as Record<string, unknown> | null },
    }));

// ------------------------------------------------------------------
// Mocks
// ------------------------------------------------------------------

vi.mock('server-only', () => ({}));

vi.mock('@nordcom/commerce-db', () => ({
    Shop: { getDomainVerification: mockGetDomainVerification },
}));

vi.mock('@/lib/domains/config', () => ({
    getVercelConfig: mockGetVercelConfig,
}));

vi.mock('@/lib/domains/targets', () => ({
    buildRecordInstructions: mockBuildRecordInstructions,
}));

vi.mock('./actions', () => ({
    verifyDomain: mockVerifyDomain,
}));

vi.mock('./connect-panel', () => ({
    ConnectPanel: (props: Record<string, unknown>) => {
        capturedProps.current = props;
        return <div data-testid="connect-panel" />;
    },
}));

// ------------------------------------------------------------------
// Import SUT after all mocks are registered
// ------------------------------------------------------------------

import { within } from '@testing-library/react';
import { renderRSC } from '@/utils/test/rsc';
import DomainSettingsPage from './page';

// ------------------------------------------------------------------
// Fixtures
// ------------------------------------------------------------------

const RECORDS = [{ kind: 'CNAME' as const, host: 'subdomain' as const, value: 'cname.vercel-dns.com' }];

describe('(dashboard)/[domain]/settings/domain/page', () => {
    const validParams = Promise.resolve({ domain: 'acme.myshopify.com' });

    beforeEach(() => {
        mockGetDomainVerification.mockReset();
        mockGetVercelConfig.mockReset();
        mockBuildRecordInstructions.mockReset();
        mockVerifyDomain.mockReset();
        capturedProps.current = null;
        mockBuildRecordInstructions.mockReturnValue(RECORDS);
        mockGetVercelConfig.mockReturnValue(null);
    });

    it('is an async function (server component)', () => {
        expect(typeof DomainSettingsPage).toBe('function');
    });

    it('renders the Domain heading and the domain in the connect copy', async () => {
        mockGetDomainVerification.mockResolvedValue({ status: 'verified' });

        const { container } = await renderRSC(() => DomainSettingsPage({ params: validParams }));
        const q = within(container as HTMLElement);

        expect(q.getByText('Domain')).toBeInTheDocument();
        expect(q.getByText(/acme\.myshopify\.com/)).toBeInTheDocument();
    });

    it('passes initialStatus from the verification status', async () => {
        mockGetDomainVerification.mockResolvedValue({ status: 'verified' });

        await renderRSC(() => DomainSettingsPage({ params: validParams }));

        expect(capturedProps.current?.initialStatus).toBe('verified');
    });

    it('defaults initialStatus to "pending" when verification is null', async () => {
        mockGetDomainVerification.mockResolvedValue(null);

        await renderRSC(() => DomainSettingsPage({ params: validParams }));

        expect(capturedProps.current?.initialStatus).toBe('pending');
    });

    it('passes the built records, domain, and verify action to ConnectPanel', async () => {
        mockGetDomainVerification.mockResolvedValue({ status: 'pending' });

        await renderRSC(() => DomainSettingsPage({ params: validParams }));

        expect(capturedProps.current?.records).toBe(RECORDS);
        expect(capturedProps.current?.domain).toBe('acme.myshopify.com');
        expect(capturedProps.current?.verifyAction).toBe(mockVerifyDomain);
    });

    it('derives records from the Vercel config presence', async () => {
        mockGetDomainVerification.mockResolvedValue({ status: 'pending' });
        mockGetVercelConfig.mockReturnValue({ token: 't', projectId: 'p' });

        await renderRSC(() => DomainSettingsPage({ params: validParams }));

        expect(mockBuildRecordInstructions).toHaveBeenCalledWith(expect.objectContaining({ hasVercel: true }));
    });

    it('reads the verification using the route domain', async () => {
        mockGetDomainVerification.mockResolvedValue({ status: 'pending' });

        await renderRSC(() => DomainSettingsPage({ params: validParams }));

        expect(mockGetDomainVerification).toHaveBeenCalledWith('acme.myshopify.com');
    });

    it('exports metadata with title "Domain"', async () => {
        const { metadata } = await import('./page');
        expect((metadata as { title?: string }).title).toBe('Domain');
    });
});
