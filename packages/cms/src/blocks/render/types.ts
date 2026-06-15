import type { ResponsiveValue } from '../../responsive';

/**
 * Minimal shop reference passed through the block render context to loader
 * functions that need to scope Shopify queries to the current tenant.
 *
 * @example
 *   const shop: Shop = { id: 'tenant-123', domain: 'beta.example.com' };
 */
export type Shop = { id: string; domain: string };

/**
 * Active locale reference forwarded to block loaders and `resolveLink` so
 * internal link URLs are prefixed with the correct locale code.
 *
 * @example
 *   const locale: LocaleRef = { code: 'en-US' };
 */
export type LocaleRef = { code: string };

/**
 * Minimal Shopify product shape returned by {@link BlockLoaders} methods.
 * Blocks only need handle + title to render; imageUrl and price are optional
 * enrichment fields.
 *
 * @example
 *   const p: ShopifyProductSummary = { handle: 'my-shoe', title: 'My Shoe' };
 */
export type ShopifyProductSummary = {
    handle: string;
    title: string;
    imageUrl?: string;
    price?: { amount: string; currencyCode: string };
};

/**
 * Minimal Shopify collection shape returned by {@link BlockLoaders.loadCollection}.
 *
 * @example
 *   const col: ShopifyCollectionSummary = { handle: 'sale', title: 'Sale', products: [] };
 */
export type ShopifyCollectionSummary = {
    handle: string;
    title: string;
    description?: string;
    products: ShopifyProductSummary[];
};

/**
 * Minimal vendor summary returned by {@link BlockLoaders.loadVendors}, used to
 * render the vendor showcase block.
 *
 * @example
 *   const v: ShopifyVendorSummary = { name: 'Acme', productCount: 14 };
 */
export type ShopifyVendorSummary = { name: string; productCount: number };

/**
 * Async data-fetching interface injected into {@link BlockRenderContext}.
 * Each method maps to a block type that requires Shopify data. The storefront
 * implements this against its own GraphQL client; tests can pass stubs.
 *
 * @example
 *   const loaders: BlockLoaders = { loadCollection, loadVendors, loadOverview };
 */
export type BlockLoaders = {
    loadCollection: (args: {
        shop: Shop;
        locale: LocaleRef;
        handle: string;
        limit: number;
    }) => Promise<ShopifyCollectionSummary | null>;
    loadVendors: (args: { shop: Shop; locale: LocaleRef; limit: number }) => Promise<ShopifyVendorSummary[]>;
    loadOverview: (args: {
        shop: Shop;
        locale: LocaleRef;
        source: 'collection' | 'latest' | 'featured';
        handle?: string;
        limit: number;
    }) => Promise<ShopifyProductSummary[]>;
};

/**
 * Shared context passed from the storefront page to every block component.
 * Blocks use it to scope Shopify queries to the current tenant and locale, and
 * to track nesting depth for the Columns block recursion guard.
 *
 * @example
 *   const ctx: BlockRenderContext = { shop, locale, loaders };
 */
export type BlockRenderContext = {
    shop: Shop;
    locale: LocaleRef;
    loaders: BlockLoaders;
    /** Forwarded to nested BlockRenderer calls inside the Columns block. */
    depth?: number;
};

/**
 * CMS node shape for a Lexical rich-text block, as stored by Payload.
 *
 * @example
 *   const node: RichTextBlockNode = { blockType: 'rich-text', body: lexicalJson };
 */
export type RichTextBlockNode = {
    blockType: 'rich-text';
    body: unknown;
    collapsible?: boolean;
    collapsedByDefault?: boolean;
    collapseLabel?: string;
};

/**
 * CMS node shape for an alert block with severity, title, and optional body.
 *
 * @example
 *   const node: AlertBlockNode = { blockType: 'alert', severity: 'warning', title: 'Heads up' };
 */
export type AlertBlockNode = {
    blockType: 'alert';
    severity: 'info' | 'success' | 'warning' | 'error';
    title: string;
    body?: string;
    dismissible?: boolean;
};

/**
 * CMS node shape for a raw HTML block injected via `dangerouslySetInnerHTML`.
 *
 * @example
 *   const node: HtmlBlockNode = { blockType: 'html', html: '<marquee>Hello</marquee>' };
 */
export type HtmlBlockNode = { blockType: 'html'; html: string };

/**
 * Mirrors the shape the `linkField` group emits — `kind` discriminates which
 * of `page`/`article`/`product`/`collectionRef`/`url` carries the actual
 * destination. The renderers route this through `resolveLink()` (from the
 * api package) so internal page/article/product/collection links resolve to
 * proper storefront URLs instead of silently rendering nothing.
 *
 * The old renderers only read `link.url`, so anything other than
 * `kind: 'external'` / `kind: 'anchor'` rendered as a missing link.
 */
export type LinkRef = {
    kind?: 'page' | 'article' | 'product' | 'collection' | 'external' | 'anchor';
    page?: { slug?: string } | string | null;
    article?: { slug?: string } | string | null;
    product?: { shopifyHandle?: string } | string | null;
    collectionRef?: { shopifyHandle?: string } | string | null;
    url?: string;
    label?: string;
    openInNewTab?: boolean;
};

/**
 * A single item in a media-grid block. The image relation can be a populated
 * Payload media doc or an unpopulated id string.
 *
 * @example
 *   const item: MediaItem = { image: { id: '123', url: '/media/foo.jpg', alt: 'Foo' } };
 */
export type MediaItem = {
    image?: { id: string; url?: string; alt?: string } | string | null;
    caption?: string;
    link?: LinkRef | null;
};

/**
 * CMS node shape for a configurable image/icon grid block.
 *
 * @example
 *   const node: MediaGridBlockNode = { blockType: 'media-grid', itemType: 'image', columns: 3, items: [] };
 */
export type MediaGridBlockNode = {
    blockType: 'media-grid';
    itemType: 'image' | 'icon';
    columns: number;
    items: MediaItem[];
};

/**
 * CMS node shape for a full-width banner block with heading, background image,
 * and CTA link.
 *
 * @example
 *   const node: BannerBlockNode = { blockType: 'banner', heading: 'Sale', alignment: 'center' };
 */
export type BannerBlockNode = {
    blockType: 'banner';
    heading: string;
    subheading?: string;
    background?: { id: string; url?: string; alt?: string } | string | null;
    cta?: LinkRef | null;
    alignment: 'left' | 'center' | 'right';
};

/** Whether a collection renders as a wrapping grid or a horizontal scroll rail. */
export type CollectionLayoutMode = 'grid' | 'carousel';

/**
 * CMS node shape for a Shopify collection embed block.
 *
 * `layout` is a per-breakpoint {@link ResponsiveValue} (e.g.
 * `{ base: 'carousel', md: 'grid' }`). A bare string is accepted as legacy
 * single-axis content authored before the field went responsive.
 *
 * @example
 *   const node: CollectionBlockNode = { blockType: 'collection', handle: 'sale', layout: { base: 'carousel', md: 'grid' }, limit: 8 };
 */
export type CollectionBlockNode = {
    blockType: 'collection';
    handle: string;
    title?: string;
    layout?: ResponsiveValue<CollectionLayoutMode> | CollectionLayoutMode;
    limit: number;
};

/**
 * CMS node shape for a vendor showcase block that lists unique Shopify vendors.
 *
 * @example
 *   const node: VendorsBlockNode = { blockType: 'vendors', maxVendors: 12 };
 */
export type VendorsBlockNode = {
    blockType: 'vendors';
    title?: string;
    maxVendors: number;
};

/**
 * CMS node shape for a product overview block sourced from a collection,
 * latest products, or featured products.
 *
 * @example
 *   const node: OverviewBlockNode = { blockType: 'overview', source: 'latest', limit: 8 };
 */
export type OverviewBlockNode = {
    blockType: 'overview';
    source: 'collection' | 'latest' | 'featured';
    collectionHandle?: string;
    title?: string;
    limit: number;
};

/**
 * CMS node shape for a multi-column layout block. Each column carries a width
 * token and a nested array of any other block types.
 *
 * @example
 *   const node: ColumnsBlockNode = { blockType: 'columns', columns: [{ width: '1/2', content: [] }] };
 */
export type ColumnsBlockNode = {
    blockType: 'columns';
    columns: Array<{ width: 'auto' | '1/3' | '1/2' | '2/3' | 'full'; content: BlockNode[] }>;
};

/**
 * Discriminated union of all CMS block node types. The `blockType` field acts
 * as the discriminant; `BlockRenderer` switches on it to pick the right component.
 *
 * @example
 *   const block: BlockNode = { blockType: 'alert', severity: 'info', title: 'Hi' };
 */
export type BlockNode =
    | RichTextBlockNode
    | AlertBlockNode
    | HtmlBlockNode
    | MediaGridBlockNode
    | BannerBlockNode
    | CollectionBlockNode
    | VendorsBlockNode
    | OverviewBlockNode
    | ColumnsBlockNode;
