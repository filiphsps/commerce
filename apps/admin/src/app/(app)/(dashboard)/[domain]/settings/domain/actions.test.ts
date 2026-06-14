import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
    mockAuthedCtx,
    mockSetVerification,
    mockGetVercelConfig,
    mockCheckConnection,
    mockAddDomain,
    mockDomainStatus,
} = vi.hoisted(() => ({
    mockAuthedCtx: vi.fn(),
    mockSetVerification: vi.fn(),
    mockGetVercelConfig: vi.fn(),
    mockCheckConnection: vi.fn(),
    mockAddDomain: vi.fn(),
    mockDomainStatus: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/cms-ctx', () => ({ getAuthedCmsCtx: mockAuthedCtx }));
vi.mock('@nordcom/commerce-db', () => ({ Shop: { setDomainVerification: mockSetVerification } }));
vi.mock('@/lib/domains/config', () => ({ getVercelConfig: mockGetVercelConfig }));
vi.mock('@/lib/domains/verify', () => ({ checkDomainConnection: mockCheckConnection }));
vi.mock('@/lib/domains/vercel', () => ({ addProjectDomain: mockAddDomain, getProjectDomainStatus: mockDomainStatus }));

import { verifyDomain } from './actions';

beforeEach(() => {
    mockAuthedCtx.mockResolvedValue({ user: { role: 'admin' } });
    mockSetVerification.mockResolvedValue(undefined);
    mockGetVercelConfig.mockReturnValue(null);
    process.env.SERVICE_DOMAIN = 'shops.nordcom.io';
});
afterEach(() => {
    vi.clearAllMocks();
});

describe('verifyDomain', () => {
    it('auto-verifies a localhost domain without any network call', async () => {
        const result = await verifyDomain('hello.localhost');
        expect(result).toEqual({ status: 'verified', via: 'localhost' });
        expect(mockCheckConnection).not.toHaveBeenCalled();
        expect(mockAddDomain).not.toHaveBeenCalled();
        expect(mockSetVerification).toHaveBeenCalledWith(
            'hello.localhost',
            expect.objectContaining({ status: 'verified', via: 'localhost' }),
        );
    });

    it('persists verified when the DNS fallback reports connected', async () => {
        mockCheckConnection.mockResolvedValue({ connected: true, via: 'service_domain' });
        const result = await verifyDomain('shop.acme.com');
        expect(result).toMatchObject({ status: 'verified', via: 'service_domain' });
        expect(mockSetVerification).toHaveBeenCalledWith(
            'shop.acme.com',
            expect.objectContaining({ status: 'verified', via: 'service_domain' }),
        );
    });

    it('stays pending when the domain is not pointed yet', async () => {
        mockCheckConnection.mockResolvedValue({ connected: false });
        const result = await verifyDomain('shop.acme.com');
        expect(result).toMatchObject({ status: 'pending' });
        expect(mockSetVerification).toHaveBeenCalledWith('shop.acme.com', { status: 'pending' });
    });

    it('uses Vercel when creds exist and the domain is verified there', async () => {
        mockGetVercelConfig.mockReturnValue({ token: 't', projectId: 'p' });
        mockAddDomain.mockResolvedValue(undefined);
        mockDomainStatus.mockResolvedValue({ verified: true, misconfigured: false });
        const result = await verifyDomain('shop.acme.com');
        expect(result).toEqual({ status: 'verified', via: 'vercel' });
        expect(mockCheckConnection).not.toHaveBeenCalled();
    });

    it('records failed on a transport error during the check', async () => {
        mockCheckConnection.mockRejectedValue(new Error('DNS lookup failed'));
        const result = await verifyDomain('shop.acme.com');
        expect(result).toMatchObject({ status: 'failed', error: 'DNS lookup failed' });
        expect(mockSetVerification).toHaveBeenCalledWith('shop.acme.com', { status: 'failed' });
    });
});
