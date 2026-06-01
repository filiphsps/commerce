import type { Payload } from 'payload';
import { describe, expect, it, vi } from 'vitest';
import { getArticle } from './get-article';
import { getArticles } from './get-articles';
import { getBusinessData } from './get-business-data';
import { getCollectionMetadata } from './get-collection-metadata';
import { getFooter } from './get-footer';
import { getHeader } from './get-header';
import { getPage } from './get-page';
import { getPages } from './get-pages';
import { getProductMetadata } from './get-product-metadata';
import { resolveLink } from './resolve-link';
import { __resetTenantIdCache, resolveTenantId } from './resolve-tenant-id';

// SFREAD-01 — output-side freeze of the storefront CMS read contract.
//
// Sibling gate `tenant-filter-contract.test.ts` froze the INPUT side: the
// `where` predicates, the never-drop sentinel, and the tenant resolution path.
// This file freezes the OUTPUT side: the exact runtime SHAPE each of the 11
// getters returns for the canonical seed, the depth-N populate passthrough (the
// getter does not transform the doc — populated relations arrive as nested
// objects and are returned untouched), and the null-on-missing contract (a
// missing doc resolves to `null`, never throws, so the host page is not 404'd).
// The Convex re-point (CUTOVER-04/05/06) must keep every assertion below
// byte-identical behind unchanged signatures.
//
// Since UNIFY-03 repointed `tenantsSlug` to `shops`, the tenant key IS the shop
// row id: `resolveTenantId` confirms the shop exists in the unified `shops`
// collection and returns that id (identity over the shop id). Every OUTPUT
// shape below is unchanged.

type FindArgs = Parameters<Payload['find']>[0];

const SHOP_ID = 'shop-x';

/**
 * Build a Payload test double whose `find` resolves the `shops` collection to a
 * single shop doc (so `resolveTenantId` succeeds) and echoes the supplied docs
 * verbatim for any content collection — proving the getter passes Payload's
 * populated document straight through without reshaping it.
 *
 * @param docs - Documents returned for non-`shops` collections.
 * @returns The fake Payload instance plus the underlying `find` spy.
 */
const makePayload = (docs: unknown[] = []): { payload: Payload; find: ReturnType<typeof vi.fn> } => {
    const find = vi.fn(async (args: FindArgs) => {
        if (args.collection === 'shops') {
            return {
                docs: [{ id: SHOP_ID }],
                totalDocs: 1,
                totalPages: 1,
                page: 1,
                pagingCounter: 1,
                hasNextPage: false,
                hasPrevPage: false,
                limit: 1,
            };
        }
        return {
            docs,
            totalDocs: docs.length,
            totalPages: 1,
            page: 1,
            pagingCounter: 1,
            hasNextPage: false,
            hasPrevPage: false,
            limit: 100,
        };
    });
    return { payload: { find } as unknown as Payload, find };
};

/**
 * Build a Payload test double whose `shops` lookup returns no docs, so every
 * getter exercises the unresolved-shop branch (`null` for the singletons /
 * single-doc getters, the never-drop sentinel for the list getters).
 *
 * @returns The fake Payload instance plus the underlying `find` spy.
 */
const makePayloadWithoutShop = (): { payload: Payload; find: ReturnType<typeof vi.fn> } => {
    const find = vi.fn(async () => ({
        docs: [],
        totalDocs: 0,
        totalPages: 0,
        page: 1,
        pagingCounter: 0,
        hasNextPage: false,
        hasPrevPage: false,
        limit: 100,
    }));
    return { payload: { find } as unknown as Payload, find };
};

/** Minimal shop reference accepted by every getter. */
const shop = () => ({ id: SHOP_ID, domain: 'x.test', i18n: { defaultLocale: 'en-US' } });

const locale = { code: 'en-US' };

// Canonical seed docs. Localized fields arrive already locale-resolved (Payload
// resolves `localized: true` fields server-side before returning), and depth-2
// upload relations arrive as populated nested objects — the shape the storefront
// renderers consume. The getters must return these untouched.

/** Populated depth-2 Media relation — a nested object, not a bare id string. */
const MEDIA = {
    id: 'media-1',
    alt: 'Hero',
    url: 'https://cdn.test/hero.png',
    mimeType: 'image/png',
    width: 1600,
    height: 900,
};

const PAGE_DOC = {
    id: 'page-1',
    slug: 'home',
    title: 'Home',
    blocks: [{ id: 'b1', blockType: 'media-grid', items: [{ id: 'i1', image: MEDIA }] }],
    seo: { title: 'Home', description: 'Welcome', image: MEDIA },
    _status: 'published',
    updatedAt: '2026-05-01T00:00:00.000Z',
    createdAt: '2026-04-01T00:00:00.000Z',
};

const ARTICLE_DOC = {
    id: 'article-1',
    slug: 'launch-news',
    title: 'Launch News',
    author: 'Editorial',
    publishedAt: '2026-05-02T00:00:00.000Z',
    excerpt: 'We launched.',
    body: { root: { children: [{ type: 'paragraph', children: [{ type: 'text', text: 'EN body' }] }] } },
    tags: ['news', 'release'],
    cover: MEDIA,
    _status: 'published',
    updatedAt: '2026-05-02T00:00:00.000Z',
    createdAt: '2026-04-02T00:00:00.000Z',
};

const HEADER_DOC = {
    id: 'header-1',
    logoLink: '/',
    items: [{ id: 'n1', link: { kind: 'external', label: 'Shop', url: '/shop/', openInNewTab: false } }],
    localeSwitcher: { enabled: true, label: 'Region' },
    cta: { kind: 'external', label: 'Sign up', url: '/newsletter/', openInNewTab: false },
    _status: 'published',
    updatedAt: '2026-05-03T00:00:00.000Z',
    createdAt: '2026-04-03T00:00:00.000Z',
};

const FOOTER_DOC = {
    id: 'footer-1',
    sections: [{ id: 's1', title: 'Help', links: [{ id: 'l1', link: { kind: 'anchor', url: 'faq' } }] }],
    social: [{ id: 'so1', platform: 'Instagram', url: 'https://instagram.com/demo' }],
    legal: [{ id: 'lg1', link: { kind: 'external', url: '/terms/' } }],
    _status: 'published',
    updatedAt: '2026-05-04T00:00:00.000Z',
    createdAt: '2026-04-04T00:00:00.000Z',
};

const BUSINESS_DATA_DOC = {
    id: 'biz-1',
    legalName: 'Nordcom Demo Shop AB',
    supportEmail: 'hello@demo.example.com',
    address: { line1: 'Norrlandsgatan 12', city: 'Stockholm', country: 'Sweden' },
    profiles: [{ id: 'p1', platform: 'Instagram', handle: '@demo', url: 'https://instagram.com/demo' }],
    _status: 'published',
    updatedAt: '2026-05-05T00:00:00.000Z',
    createdAt: '2026-04-05T00:00:00.000Z',
};

const PRODUCT_METADATA_DOC = {
    id: 'pm-1',
    shopifyHandle: 'mug',
    descriptionOverride: { root: { children: [{ type: 'paragraph', children: [{ type: 'text', text: 'Mug' }] }] } },
    blocks: [{ id: 'pb1', blockType: 'rich-text' }],
    seo: { title: 'Mug', image: MEDIA },
    _status: 'published',
    updatedAt: '2026-05-06T00:00:00.000Z',
    createdAt: '2026-04-06T00:00:00.000Z',
};

const COLLECTION_METADATA_DOC = {
    id: 'cm-1',
    shopifyHandle: 'sale',
    descriptionOverride: { root: { children: [{ type: 'paragraph', children: [{ type: 'text', text: 'Sale' }] }] } },
    blocks: [{ id: 'cb1', blockType: 'collection' }],
    seo: { title: 'Sale', image: MEDIA },
    _status: 'published',
    updatedAt: '2026-05-07T00:00:00.000Z',
    createdAt: '2026-04-07T00:00:00.000Z',
};

describe('CMS read contract — golden output shapes (11 getters)', () => {
    describe('single-doc getters return the populated doc untransformed, or null on miss', () => {
        it('getPage returns the exact page doc (depth-2 populate passed through)', async () => {
            const { payload } = makePayload([PAGE_DOC]);
            const page = await getPage({ shop: shop(), locale, slug: 'home', __payload: payload });
            expect(page).toEqual(PAGE_DOC);
            // The depth-2 upload relation stays a populated object, not an id.
            expect((page as typeof PAGE_DOC).blocks[0]?.items[0]?.image).toEqual(MEDIA);
            __resetTenantIdCache(payload);
        });

        it('getArticle returns the exact article doc', async () => {
            const { payload } = makePayload([ARTICLE_DOC]);
            const article = await getArticle({ shop: shop(), locale, slug: 'launch-news', __payload: payload });
            expect(article).toEqual(ARTICLE_DOC);
            __resetTenantIdCache(payload);
        });

        it('getHeader returns the exact header singleton', async () => {
            const { payload } = makePayload([HEADER_DOC]);
            const header = await getHeader({ shop: shop(), locale, __payload: payload });
            expect(header).toEqual(HEADER_DOC);
            __resetTenantIdCache(payload);
        });

        it('getFooter returns the exact footer singleton', async () => {
            const { payload } = makePayload([FOOTER_DOC]);
            const footer = await getFooter({ shop: shop(), locale, __payload: payload });
            expect(footer).toEqual(FOOTER_DOC);
            __resetTenantIdCache(payload);
        });

        it('getBusinessData returns the exact businessData singleton', async () => {
            const { payload } = makePayload([BUSINESS_DATA_DOC]);
            const biz = await getBusinessData({ shop: shop(), locale, __payload: payload });
            expect(biz).toEqual(BUSINESS_DATA_DOC);
            __resetTenantIdCache(payload);
        });

        it('getProductMetadata returns the exact productMetadata doc', async () => {
            const { payload } = makePayload([PRODUCT_METADATA_DOC]);
            const meta = await getProductMetadata({ shop: shop(), locale, shopifyHandle: 'mug', __payload: payload });
            expect(meta).toEqual(PRODUCT_METADATA_DOC);
            __resetTenantIdCache(payload);
        });

        it('getCollectionMetadata returns the exact collectionMetadata doc', async () => {
            const { payload } = makePayload([COLLECTION_METADATA_DOC]);
            const meta = await getCollectionMetadata({
                shop: shop(),
                locale,
                shopifyHandle: 'sale',
                __payload: payload,
            });
            expect(meta).toEqual(COLLECTION_METADATA_DOC);
            __resetTenantIdCache(payload);
        });
    });

    describe('null-on-missing — single-doc getters resolve to null (never throw)', () => {
        const cases: Array<{ name: string; run: (p: Payload) => Promise<unknown> }> = [
            { name: 'getPage', run: (p) => getPage({ shop: shop(), locale, slug: 'absent', __payload: p }) },
            { name: 'getArticle', run: (p) => getArticle({ shop: shop(), locale, slug: 'absent', __payload: p }) },
            { name: 'getHeader', run: (p) => getHeader({ shop: shop(), locale, __payload: p }) },
            { name: 'getFooter', run: (p) => getFooter({ shop: shop(), locale, __payload: p }) },
            { name: 'getBusinessData', run: (p) => getBusinessData({ shop: shop(), locale, __payload: p }) },
            {
                name: 'getProductMetadata',
                run: (p) => getProductMetadata({ shop: shop(), locale, shopifyHandle: 'x', __payload: p }),
            },
            {
                name: 'getCollectionMetadata',
                run: (p) => getCollectionMetadata({ shop: shop(), locale, shopifyHandle: 'x', __payload: p }),
            },
        ];

        for (const { name, run } of cases) {
            it(`${name} returns null when the doc is missing`, async () => {
                const { payload } = makePayload([]);
                await expect(run(payload)).resolves.toBeNull();
                __resetTenantIdCache(payload);
            });

            it(`${name} returns null when the shop is unresolved`, async () => {
                const { payload } = makePayloadWithoutShop();
                await expect(run(payload)).resolves.toBeNull();
                __resetTenantIdCache(payload);
            });
        }
    });

    describe('list getters return the full paginated envelope', () => {
        it('getPages returns docs + pagination meta', async () => {
            const { payload } = makePayload([PAGE_DOC]);
            const result = await getPages({ shop: shop(), locale, __payload: payload });
            expect(result.docs).toEqual([PAGE_DOC]);
            expect(result).toMatchObject({
                totalDocs: 1,
                page: 1,
                hasNextPage: false,
                hasPrevPage: false,
            });
            __resetTenantIdCache(payload);
        });

        it('getArticles returns docs + pagination meta', async () => {
            const { payload } = makePayload([ARTICLE_DOC]);
            const result = await getArticles({ shop: shop(), locale, __payload: payload });
            expect(result.docs).toEqual([ARTICLE_DOC]);
            expect(result).toMatchObject({ totalDocs: 1, hasNextPage: false, hasPrevPage: false });
            __resetTenantIdCache(payload);
        });

        it('getPages returns an empty doc list (never throws) when the shop is unresolved', async () => {
            const { payload } = makePayloadWithoutShop();
            const result = await getPages({ shop: shop(), locale, __payload: payload });
            expect(result.docs).toEqual([]);
            __resetTenantIdCache(payload);
        });

        it('getArticles returns an empty doc list (never throws) when the shop is unresolved', async () => {
            const { payload } = makePayloadWithoutShop();
            const result = await getArticles({ shop: shop(), locale, __payload: payload });
            expect(result.docs).toEqual([]);
            __resetTenantIdCache(payload);
        });
    });

    describe('resolveLink — pure URL contract for all six link kinds', () => {
        const ctx = { locale };
        it('external → url as-is', () => {
            expect(resolveLink({ kind: 'external', url: 'https://example.com' }, ctx)).toBe('https://example.com');
        });
        it('anchor → leading hash', () => {
            expect(resolveLink({ kind: 'anchor', url: 'features' }, ctx)).toBe('#features');
        });
        it('page → locale-prefixed, trailing-slashed path', () => {
            expect(resolveLink({ kind: 'page', page: { slug: 'about' } }, ctx)).toBe('/en-US/about/');
        });
        it('article → blog path', () => {
            expect(resolveLink({ kind: 'article', article: { slug: 'hello' } }, ctx)).toBe('/en-US/blog/hello/');
        });
        it('product → products path by handle', () => {
            expect(resolveLink({ kind: 'product', product: { shopifyHandle: 'mug' } }, ctx)).toBe(
                '/en-US/products/mug/',
            );
        });
        it('collection → collections path by handle', () => {
            expect(resolveLink({ kind: 'collection', collectionRef: { shopifyHandle: 'sale' } }, ctx)).toBe(
                '/en-US/collections/sale/',
            );
        });
        it('unpopulated relation (raw id string) → empty string, never throws', () => {
            expect(resolveLink({ kind: 'page', page: 'raw-id' }, ctx)).toBe('');
            expect(resolveLink({ kind: 'page' } as never, ctx)).toBe('');
        });
    });

    describe('resolveTenantId — identity over the shop id', () => {
        it('returns the shop id for an existing shop', async () => {
            const { payload } = makePayload([]);
            await expect(resolveTenantId(payload, SHOP_ID)).resolves.toBe(SHOP_ID);
            __resetTenantIdCache(payload);
        });
        it('returns null (never throws) when no shop row matches', async () => {
            const { payload } = makePayloadWithoutShop();
            await expect(resolveTenantId(payload, SHOP_ID)).resolves.toBeNull();
            __resetTenantIdCache(payload);
        });
    });
});
