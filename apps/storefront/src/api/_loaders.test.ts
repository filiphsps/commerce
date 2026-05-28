import { cacheTag } from 'next/cache';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/cache', () => ({
    cacheTag: vi.fn(),
    cacheLife: vi.fn(),
    unstable_cache: vi.fn(),
    revalidateTag: vi.fn(),
}));

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

// --- Shopify entity loaders ---

const ProductApiMock = vi.fn();
const CollectionApiMock = vi.fn();
const BlogApiMock = vi.fn();
const ArticleApiMock = vi.fn();

vi.mock('./shopify/product', () => ({
    ProductApi: ProductApiMock,
}));

vi.mock('./shopify/collection', () => ({
    CollectionApi: CollectionApiMock,
}));

vi.mock('./shopify/blog', () => ({
    BlogApi: BlogApiMock,
}));

vi.mock('./article', () => ({
    ArticleApi: ArticleApiMock,
}));

// --- CMS loaders ---

const HeaderApiMock = vi.fn();
const FooterApiMock = vi.fn();
const InfoBarApiMock = vi.fn();
const ProductMetadataApiMock = vi.fn();
const CollectionMetadataApiMock = vi.fn();
const PagesApiMock = vi.fn();

vi.mock('./header', () => ({ HeaderApi: HeaderApiMock }));
vi.mock('./footer', () => ({ FooterApi: FooterApiMock }));
vi.mock('./info-bar', () => ({ InfoBarApi: InfoBarApiMock }));
vi.mock('./metadata', () => ({
    ProductMetadataApi: ProductMetadataApiMock,
    CollectionMetadataApi: CollectionMetadataApiMock,
}));
vi.mock('./page', () => ({ PagesApi: PagesApiMock }));

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
        // Options are normalized into explicit primitives so the cache() key is
        // stable across calls (see _shop-loader); the underlying lookup receives
        // the defaulted option object.
        expect(findByDomainMock).toHaveBeenCalledWith('shop-1.com', {
            sensitiveData: false,
            convert: true,
            populate: [],
        });
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

describe('ProductApi loader', () => {
    it('wraps source ProductApi and delegates', async () => {
        const mod = await import('./_loaders');
        ProductApiMock.mockClear();
        ProductApiMock.mockResolvedValue([{ id: 'p1', handle: 'red-widget' }, null] as any);

        expect(mod.ProductApi).not.toBe(ProductApiMock);

        const result = await mod.ProductApi({
            api: { shop: () => ({ id: 's1', domain: 's1.com' }), locale: () => ({ code: 'en-US' }) } as any,
            handle: 'red-widget',
        });
        expect(result).toEqual([{ id: 'p1', handle: 'red-widget' }, null]);
        expect(ProductApiMock).toHaveBeenCalled();
    });
});

describe('CollectionApi loader', () => {
    it('wraps source CollectionApi and delegates', async () => {
        const mod = await import('./_loaders');
        CollectionApiMock.mockClear();
        CollectionApiMock.mockResolvedValue({ id: 'c1', handle: 'summer-sale' } as any);

        expect(mod.CollectionApi).not.toBe(CollectionApiMock);

        const result = await mod.CollectionApi({
            api: { shop: () => ({ id: 's2', domain: 's2.com' }), locale: () => ({ code: 'en-US' }) } as any,
            handle: 'summer-sale',
        });
        expect(result).toEqual({ id: 'c1', handle: 'summer-sale' });
        expect(CollectionApiMock).toHaveBeenCalled();
    });
});

describe('BlogApi loader', () => {
    it('wraps source BlogApi and delegates', async () => {
        const mod = await import('./_loaders');
        BlogApiMock.mockClear();
        BlogApiMock.mockResolvedValue([{ id: 'b1', handle: 'news' }, null] as any);

        expect(mod.BlogApi).not.toBe(BlogApiMock);

        const result = await mod.BlogApi({ api: {} as any, handle: 'news' });
        expect(result).toEqual([{ id: 'b1', handle: 'news' }, null]);
        expect(BlogApiMock).toHaveBeenCalled();
    });
});

describe('ArticleApi loader', () => {
    it('wraps source ArticleApi and delegates', async () => {
        const mod = await import('./_loaders');
        ArticleApiMock.mockClear();
        ArticleApiMock.mockResolvedValue({ id: 'a1', slug: 'hello-world' } as any);

        expect(mod.ArticleApi).not.toBe(ArticleApiMock);

        const result = await mod.ArticleApi({ shop: {} as any, locale: {} as any, slug: 'hello-world' });
        expect(result).toEqual({ id: 'a1', slug: 'hello-world' });
        expect(ArticleApiMock).toHaveBeenCalled();
    });
});

describe('CMS loaders', () => {
    it('HeaderApi wraps source and delegates', async () => {
        const mod = await import('./_loaders');
        HeaderApiMock.mockClear();
        HeaderApiMock.mockResolvedValue({ items: [] } as any);

        expect(mod.HeaderApi).not.toBe(HeaderApiMock);

        const result = await mod.HeaderApi({ shop: {} as any, locale: {} as any });
        expect(result).toEqual({ items: [] });
        expect(HeaderApiMock).toHaveBeenCalled();
    });

    it('FooterApi wraps source and delegates', async () => {
        const mod = await import('./_loaders');
        FooterApiMock.mockClear();
        FooterApiMock.mockResolvedValue({ links: [] } as any);

        expect(mod.FooterApi).not.toBe(FooterApiMock);

        const result = await mod.FooterApi({ shop: {} as any, locale: {} as any });
        expect(result).toEqual({ links: [] });
        expect(FooterApiMock).toHaveBeenCalled();
    });

    it('InfoBarApi wraps source and delegates', async () => {
        const mod = await import('./_loaders');
        InfoBarApiMock.mockClear();
        InfoBarApiMock.mockResolvedValue({ message: 'hello' } as any);

        expect(mod.InfoBarApi).not.toBe(InfoBarApiMock);

        const result = await mod.InfoBarApi({ shop: {} as any, locale: {} as any });
        expect(result).toEqual({ message: 'hello' });
        expect(InfoBarApiMock).toHaveBeenCalled();
    });

    it('ProductMetadataApi wraps source and delegates', async () => {
        const mod = await import('./_loaders');
        ProductMetadataApiMock.mockClear();
        ProductMetadataApiMock.mockResolvedValue({ handle: 'red-widget' } as any);

        expect(mod.ProductMetadataApi).not.toBe(ProductMetadataApiMock);

        const result = await mod.ProductMetadataApi({ shop: {} as any, locale: {} as any, handle: 'red-widget' });
        expect(result).toEqual({ handle: 'red-widget' });
        expect(ProductMetadataApiMock).toHaveBeenCalled();
    });

    it('CollectionMetadataApi wraps source and delegates', async () => {
        const mod = await import('./_loaders');
        CollectionMetadataApiMock.mockClear();
        CollectionMetadataApiMock.mockResolvedValue({ handle: 'summer-sale' } as any);

        expect(mod.CollectionMetadataApi).not.toBe(CollectionMetadataApiMock);

        const result = await mod.CollectionMetadataApi({ shop: {} as any, locale: {} as any, handle: 'summer-sale' });
        expect(result).toEqual({ handle: 'summer-sale' });
        expect(CollectionMetadataApiMock).toHaveBeenCalled();
    });

    it('PagesApi wraps source and delegates', async () => {
        const mod = await import('./_loaders');
        PagesApiMock.mockClear();
        PagesApiMock.mockResolvedValue([{ slug: 'about' }] as any);

        expect(mod.PagesApi).not.toBe(PagesApiMock);

        const result = await mod.PagesApi({ shop: {} as any, locale: {} as any });
        expect(result).toEqual([{ slug: 'about' }]);
        expect(PagesApiMock).toHaveBeenCalled();
    });
});

describe('Cache discipline — cache tags', () => {
    it('ProductApi writes tenant + entity tags', async () => {
        const spy = vi.mocked(cacheTag);
        spy.mockClear();
        const { ProductApi } = await import('./_loaders');
        const fakeApi = {
            shop: () => ({ id: 'shop-1', domain: 'shop-1.com' }),
            locale: () => ({ code: 'en-US' }),
        } as any;
        await ProductApi({ api: fakeApi, handle: 'red-widget' });
        const tagsWritten = spy.mock.calls.flat();
        expect(tagsWritten.some((t) => String(t).includes('shop-1'))).toBe(true);
        expect(tagsWritten.some((t) => String(t).includes('red-widget'))).toBe(true);
    });

    it('CollectionApi writes tenant + entity tags', async () => {
        const spy = vi.mocked(cacheTag);
        spy.mockClear();
        const { CollectionApi } = await import('./_loaders');
        const fakeApi = {
            shop: () => ({ id: 'shop-2', domain: 'shop-2.com' }),
            locale: () => ({ code: 'en-US' }),
        } as any;
        await CollectionApi({ api: fakeApi, handle: 'summer-sale' });
        const tagsWritten = spy.mock.calls.flat();
        expect(tagsWritten.some((t) => String(t).includes('shop-2'))).toBe(true);
        expect(tagsWritten.some((t) => String(t).includes('summer-sale'))).toBe(true);
    });

    it('PagesApi writes tenant-root tags', async () => {
        const spy = vi.mocked(cacheTag);
        spy.mockClear();
        const { PagesApi } = await import('./_loaders');
        const fakeShop = { id: 'shop-3', domain: 'shop-3.com' } as any;
        const fakeLocale = { code: 'en-US' } as any;
        await PagesApi({ shop: fakeShop, locale: fakeLocale });
        const tagsWritten = spy.mock.calls.flat();
        expect(tagsWritten.some((t) => String(t).includes('shop-3'))).toBe(true);
    });
});
