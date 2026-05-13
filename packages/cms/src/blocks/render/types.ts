export type Shop = { id: string; domain: string };
export type LocaleRef = { code: string };

export type ShopifyProductSummary = {
    handle: string;
    title: string;
    imageUrl?: string;
    price?: { amount: string; currencyCode: string };
};

export type ShopifyCollectionSummary = {
    handle: string;
    title: string;
    description?: string;
    products: ShopifyProductSummary[];
};

export type ShopifyVendorSummary = { name: string; productCount: number };

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

export type BlockRenderContext = {
    shop: Shop;
    locale: LocaleRef;
    loaders: BlockLoaders;
    /** Forwarded to nested BlockRenderer calls inside the Columns block. */
    depth?: number;
};

export type RichTextBlockNode = {
    blockType: 'rich-text';
    body: unknown;
    collapsible?: boolean;
    collapsedByDefault?: boolean;
    collapseLabel?: string;
};

export type AlertBlockNode = {
    blockType: 'alert';
    severity: 'info' | 'success' | 'warning' | 'error';
    title: string;
    body?: string;
    dismissible?: boolean;
};

export type HtmlBlockNode = { blockType: 'html'; html: string };

export type MediaItem = {
    image?: { id: string; url?: string; alt?: string } | string | null;
    caption?: string;
    link?: { url?: string; label?: string; openInNewTab?: boolean } | null;
};

export type MediaGridBlockNode = {
    blockType: 'media-grid';
    itemType: 'image' | 'icon';
    columns: number;
    items: MediaItem[];
};

export type BannerBlockNode = {
    blockType: 'banner';
    heading: string;
    subheading?: string;
    background?: { id: string; url?: string; alt?: string } | string | null;
    cta?: { url?: string; label?: string; openInNewTab?: boolean } | null;
    alignment: 'left' | 'center' | 'right';
};

export type CollectionBlockNode = {
    blockType: 'collection';
    handle: string;
    title?: string;
    layout: 'grid' | 'carousel';
    limit: number;
};

export type VendorsBlockNode = {
    blockType: 'vendors';
    title?: string;
    maxVendors: number;
};

export type OverviewBlockNode = {
    blockType: 'overview';
    source: 'collection' | 'latest' | 'featured';
    collectionHandle?: string;
    title?: string;
    limit: number;
};

export type ColumnsBlockNode = {
    blockType: 'columns';
    columns: Array<{ width: 'auto' | '1/3' | '1/2' | '2/3' | 'full'; content: BlockNode[] }>;
};

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
