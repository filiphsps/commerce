import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockAuth, mockCreate, mockFindByDomain, mockRedirect, mockRevalidatePath, mockIsNotFound } = vi.hoisted(() => ({
    mockAuth: vi.fn(),
    mockCreate: vi.fn(),
    mockFindByDomain: vi.fn(),
    mockRedirect: vi.fn((url: string): never => {
        throw new RangeError(`NEXT_REDIRECT:${url}`);
    }),
    mockRevalidatePath: vi.fn(),
    mockIsNotFound: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/auth', () => ({ auth: mockAuth }));
vi.mock('next/navigation', () => ({ redirect: mockRedirect }));
vi.mock('next/cache', () => ({ revalidatePath: mockRevalidatePath }));
vi.mock('@nordcom/commerce-db', () => ({
    Shop: { create: mockCreate, findByDomain: mockFindByDomain },
}));
vi.mock('@nordcom/commerce-errors', () => ({ Error: { isNotFound: mockIsNotFound } }));

import { checkDomainAvailability, createShop } from './actions';

beforeEach(() => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } });
});
afterEach(() => {
    vi.clearAllMocks();
});

describe('checkDomainAvailability', () => {
    it('is available when findByDomain throws a not-found error', async () => {
        mockFindByDomain.mockRejectedValue(new RangeError('unknown'));
        mockIsNotFound.mockReturnValue(true);
        await expect(checkDomainAvailability('shop.acme.com')).resolves.toEqual({ available: true });
    });
    it('is taken when findByDomain resolves a shop', async () => {
        mockFindByDomain.mockResolvedValue({ domain: 'shop.acme.com' });
        await expect(checkDomainAvailability('shop.acme.com')).resolves.toEqual({ available: false });
    });
    it('is unavailable for an invalid hostname without hitting the seam', async () => {
        await expect(checkDomainAvailability('localhost')).resolves.toEqual({ available: false });
        expect(mockFindByDomain).not.toHaveBeenCalled();
    });
});

describe('createShop', () => {
    const baseInput = {
        name: '  Acme  ',
        domain: 'https://shop.acme.com/',
        locale: 'en-US',
        provider: {
            type: 'shopify' as const,
            values: { storeDomain: 'acme.myshopify.com', publicToken: 'pub', privateToken: 'sec' },
        },
        branding: null,
    };

    it('creates a shop with the creator as an admin collaborator and redirects', async () => {
        mockCreate.mockResolvedValue({ domain: 'shop.acme.com' });
        await expect(createShop(baseInput)).rejects.toThrow('NEXT_REDIRECT:/shop.acme.com/');

        const arg = mockCreate.mock.calls[0]![0];
        expect(arg.name).toBe('Acme');
        expect(arg.domain).toBe('shop.acme.com');
        expect(arg.i18n).toEqual({ defaultLocale: 'en-US' });
        expect(arg.collaborators).toEqual([{ user: 'user-1', permissions: ['admin'] }]);
        expect(arg.design.accents).toEqual([]);
        expect(arg.design.header.logo).toEqual({ width: 125, height: 50, src: '', alt: 'Acme logo' });
        expect(arg.commerceProvider.type).toBe('shopify');
        expect(arg.commerceProvider.authentication.token).toBe('sec');
        expect(mockRevalidatePath).toHaveBeenCalledWith('/');
    });

    it('maps branding colors into accent tokens', async () => {
        mockCreate.mockResolvedValue({ domain: 'shop.acme.com' });
        await expect(
            createShop({ ...baseInput, branding: { primaryColor: '#000000', secondaryColor: '#ffffff' } }),
        ).rejects.toThrow('NEXT_REDIRECT');
        const arg = mockCreate.mock.calls[0]![0];
        expect(arg.design.accents).toEqual([
            { type: 'primary', color: '#000000', foreground: '#ffffff' },
            { type: 'secondary', color: '#ffffff', foreground: '#000000' },
        ]);
    });

    it('returns an error result when the seam throws', async () => {
        mockCreate.mockRejectedValue(new RangeError('domain already claimed'));
        await expect(createShop(baseInput)).resolves.toEqual({ ok: false, error: 'domain already claimed' });
        expect(mockRedirect).not.toHaveBeenCalled();
    });

    it('refuses when no session user is present', async () => {
        mockAuth.mockResolvedValue(null);
        await expect(createShop(baseInput)).resolves.toEqual({
            ok: false,
            error: 'You must be signed in to create a shop.',
        });
    });

    it('refuses a Shopify connection with an empty private token (defense in depth)', async () => {
        const result = await createShop({
            ...baseInput,
            provider: {
                type: 'shopify' as const,
                values: { storeDomain: 'acme.myshopify.com', publicToken: 'pub', privateToken: '' },
            },
        });
        expect(result).toEqual({ ok: false, error: 'A private Storefront access token is required.' });
        expect(mockCreate).not.toHaveBeenCalled();
    });
});
