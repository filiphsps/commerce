import { describe, expect, it, vi } from 'vitest';

const findByDomainMock = vi.fn();
const findAllMock = vi.fn();

vi.mock('@nordcom/commerce-db', async () => {
    const actual = await vi.importActual<typeof import('@nordcom/commerce-db')>('@nordcom/commerce-db');
    return {
        ...actual,
        Shop: {
            ...actual.Shop,
            findByDomain: findByDomainMock,
            findAll: findAllMock,
        },
    };
});

// --- locale + country loaders ---

const LocalesApiMock = vi.fn();
const LocaleApiMock = vi.fn();
const CountriesApiMock = vi.fn();

vi.mock('./store', () => ({
    LocalesApi: LocalesApiMock,
    LocaleApi: LocaleApiMock,
    CountriesApi: CountriesApiMock,
}));

describe('Locale + country loaders', () => {
    it('LocalesApi wraps the source function and delegates', async () => {
        const mod = await import('./_loaders');
        LocalesApiMock.mockClear();
        LocalesApiMock.mockResolvedValue([{ code: 'en-US' }] as any);

        expect(mod.LocalesApi).not.toBe(LocalesApiMock);

        const result = await mod.LocalesApi({ api: {} as any });
        expect(result).toEqual([{ code: 'en-US' }]);
        expect(LocalesApiMock).toHaveBeenCalled();
    });

    it('LocaleApi wraps the source function and delegates', async () => {
        const mod = await import('./_loaders');
        LocaleApiMock.mockClear();
        LocaleApiMock.mockResolvedValue({ code: 'en-US' } as any);

        expect(mod.LocaleApi).not.toBe(LocaleApiMock);

        const result = await mod.LocaleApi({ api: {} as any });
        expect(result).toEqual({ code: 'en-US' });
        expect(LocaleApiMock).toHaveBeenCalled();
    });

    it('CountriesApi wraps the source function and delegates', async () => {
        const mod = await import('./_loaders');
        CountriesApiMock.mockClear();
        CountriesApiMock.mockResolvedValue([{ isoCode: 'US' }] as any);

        expect(mod.CountriesApi).not.toBe(CountriesApiMock);

        const result = await mod.CountriesApi({ api: {} as any });
        expect(result).toEqual([{ isoCode: 'US' }]);
        expect(CountriesApiMock).toHaveBeenCalled();
    });
});

describe('Shop loader', () => {
    it('wraps findByDomain with React cache() and delegates to the underlying implementation', async () => {
        const { Shop } = await import('./_loaders');
        findByDomainMock.mockClear();
        findByDomainMock.mockResolvedValue({ id: 'shop-1', domain: 'shop-1.com' } as any);

        // React cache() returns a new wrapper function (not the raw mock).
        expect(Shop.findByDomain).not.toBe(findByDomainMock);

        const result = await Shop.findByDomain('shop-1.com');

        expect(result).toEqual({ id: 'shop-1', domain: 'shop-1.com' });
        expect(findByDomainMock).toHaveBeenCalledWith('shop-1.com');
    });

    it('exposes findAll passthrough', async () => {
        const { Shop } = await import('./_loaders');
        findAllMock.mockClear();
        findAllMock.mockResolvedValue([{ id: 'shop-1', domain: 'shop-1.com' }] as any);

        const result = await Shop.findAll();

        expect(result).toHaveLength(1);
        expect(findAllMock).toHaveBeenCalled();
    });
});
