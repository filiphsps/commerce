import type {
    Article,
    CollectionMetadatum,
    Footer,
    Header,
    Media,
    Page,
    ProductMetadatum,
} from '@nordcom/commerce-cms/types';
import type { OnlineShop } from '@nordcom/commerce-db';

const isoEpoch = new Date(0).toISOString();

/** The business-identity group carried on the shop record (UNIFY-SHOP). */
type BusinessData = NonNullable<OnlineShop['businessData']>;

/**
 * Builds a minimal CMS `Media` fixture for use in tests.
 *
 * @param overrides - Partial properties merged onto the base fixture.
 * @returns A mock `Media` object with sensible defaults.
 */
export const mockMedia = (overrides?: Partial<Media>): Media =>
    ({
        id: 'media-mock-1',
        tenant: 'tenant-mock',
        url: 'https://cdn.test/mock.png',
        alt: 'mock',
        width: 64,
        height: 64,
        updatedAt: isoEpoch,
        createdAt: isoEpoch,
        ...overrides,
    }) as Media;

type NavItem = NonNullable<Header['items']>[number];

/**
 * Builds a minimal CMS Header nav item fixture for use in tests.
 *
 * @param overrides - Partial properties merged onto the base nav item fixture.
 * @returns A mock `NavItem` with a default page link.
 */
export const mockNavItem = (overrides?: Partial<NavItem>): NavItem =>
    ({
        id: 'nav-1',
        link: {
            kind: 'page',
            label: 'Home',
            page: { slug: 'home' } as unknown as NonNullable<NavItem['link']>['page'],
        },
        ...overrides,
    }) as NavItem;

/**
 * Builds a minimal CMS `Header` fixture for use in tests.
 *
 * @param overrides - Partial properties merged onto the base header fixture.
 * @returns A mock `Header` in `published` status with an empty navigation list.
 */
export const mockHeader = (overrides?: Partial<Header>): Header =>
    ({
        id: 'header-mock',
        tenant: 'tenant-mock',
        logo: null,
        logoLink: '/',
        items: [],
        localeSwitcher: { enabled: true },
        cta: { kind: 'page', label: '', openInNewTab: false },
        updatedAt: isoEpoch,
        createdAt: isoEpoch,
        _status: 'published',
        ...overrides,
    }) as Header;

/**
 * Builds a minimal CMS `Footer` fixture for use in tests.
 *
 * @param overrides - Partial properties merged onto the base footer fixture.
 * @returns A mock `Footer` in `published` status with empty sections and social links.
 */
export const mockFooter = (overrides?: Partial<Footer>): Footer =>
    ({
        id: 'footer-mock',
        tenant: 'tenant-mock',
        sections: [],
        social: [],
        legal: [],
        copyrightLine: null,
        updatedAt: isoEpoch,
        createdAt: isoEpoch,
        _status: 'published',
        ...overrides,
    }) as Footer;

/**
 * Builds a minimal business-data fixture (the shop record's `businessData` group) for use in tests.
 *
 * @param overrides - Partial properties merged onto the base business data fixture.
 * @returns A mock business-data group with unset contact fields.
 */
export const mockBusinessData = (overrides?: Partial<BusinessData>): BusinessData => ({
    legalName: undefined,
    supportEmail: undefined,
    supportPhone: undefined,
    address: undefined,
    profiles: [],
    ...overrides,
});

/**
 * Builds a minimal CMS `Page` fixture for use in tests.
 *
 * @param overrides - Partial properties merged onto the base page fixture.
 * @returns A mock `Page` in `published` status with an empty block list.
 */
export const mockPage = (overrides?: Partial<Page>): Page =>
    ({
        id: 'page-mock',
        tenant: 'tenant-mock',
        title: 'Mock Page',
        slug: 'mock-page',
        blocks: [],
        seo: { title: null, description: null, keywords: [], image: null, noindex: false },
        updatedAt: isoEpoch,
        createdAt: isoEpoch,
        _status: 'published',
        ...overrides,
    }) as Page;

/**
 * Builds a minimal CMS `Article` fixture for use in tests.
 *
 * @param overrides - Partial properties merged onto the base article fixture.
 * @returns A mock `Article` in `published` status with an empty body and tag list.
 */
export const mockArticle = (overrides?: Partial<Article>): Article =>
    ({
        id: 'article-mock',
        tenant: 'tenant-mock',
        title: 'Mock Article',
        slug: 'mock-article',
        author: 'A',
        publishedAt: isoEpoch,
        cover: null,
        excerpt: null,
        body: { root: { children: [] } },
        tags: [],
        seo: { title: null, description: null, keywords: [], image: null, noindex: false },
        updatedAt: isoEpoch,
        createdAt: isoEpoch,
        _status: 'published',
        ...overrides,
    }) as Article;

/**
 * Builds a minimal CMS `ProductMetadatum` fixture for use in tests.
 *
 * @param overrides - Partial properties merged onto the base product metadata fixture.
 * @returns A mock `ProductMetadatum` in `published` status with an empty block list.
 */
export const mockProductMetadata = (overrides?: Partial<ProductMetadatum>): ProductMetadatum =>
    ({
        id: 'product-meta-mock',
        tenant: 'tenant-mock',
        shopifyHandle: 'mock-handle',
        descriptionOverride: null,
        blocks: [],
        seo: { title: null, description: null, keywords: [], image: null, noindex: false },
        updatedAt: isoEpoch,
        createdAt: isoEpoch,
        _status: 'published',
        ...overrides,
    }) as ProductMetadatum;

/**
 * Builds a minimal CMS `CollectionMetadatum` fixture for use in tests.
 *
 * @param overrides - Partial properties merged onto the base collection metadata fixture.
 * @returns A mock `CollectionMetadatum` in `published` status with an empty block list.
 */
export const mockCollectionMetadata = (overrides?: Partial<CollectionMetadatum>): CollectionMetadatum =>
    ({
        id: 'collection-meta-mock',
        tenant: 'tenant-mock',
        shopifyHandle: 'mock-handle',
        descriptionOverride: null,
        blocks: [],
        seo: { title: null, description: null, keywords: [], image: null, noindex: false },
        updatedAt: isoEpoch,
        createdAt: isoEpoch,
        _status: 'published',
        ...overrides,
    }) as CollectionMetadatum;
