import type {
    Article,
    BusinessDatum,
    CollectionMetadatum,
    Footer,
    Header,
    Media,
    Page,
    ProductMetadatum,
} from '@nordcom/commerce-cms/types';

const isoEpoch = new Date(0).toISOString();

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

export const mockBusinessData = (overrides?: Partial<BusinessDatum>): BusinessDatum =>
    ({
        id: 'business-mock',
        tenant: 'tenant-mock',
        legalName: null,
        supportEmail: null,
        supportPhone: null,
        address: undefined,
        profiles: [],
        updatedAt: isoEpoch,
        createdAt: isoEpoch,
        _status: 'published',
        ...overrides,
    }) as BusinessDatum;

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
