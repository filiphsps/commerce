/* tslint:disable */
/* eslint-disable */
/**
 * This file was automatically generated from the CMS field descriptors by
 * `pnpm cms:gen` (packages/cms/scripts/cms-gen.ts). DO NOT EDIT BY
 * HAND — changes are overwritten on the next run, and CI's `cms:gen:check`
 * drift gate fails on any uncommitted divergence. Edit the descriptors under
 * src/collections, src/blocks, and src/fields instead, then regenerate.
 */
/**
 * Supported timezones in IANA format.
 *
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "supportedTimezones".
 */
export type SupportedTimezones =
  | 'Pacific/Midway'
  | 'Pacific/Niue'
  | 'Pacific/Honolulu'
  | 'Pacific/Rarotonga'
  | 'America/Anchorage'
  | 'Pacific/Gambier'
  | 'America/Los_Angeles'
  | 'America/Tijuana'
  | 'America/Denver'
  | 'America/Phoenix'
  | 'America/Chicago'
  | 'America/Guatemala'
  | 'America/New_York'
  | 'America/Bogota'
  | 'America/Caracas'
  | 'America/Santiago'
  | 'America/Buenos_Aires'
  | 'America/Sao_Paulo'
  | 'Atlantic/South_Georgia'
  | 'Atlantic/Azores'
  | 'Atlantic/Cape_Verde'
  | 'Europe/London'
  | 'Europe/Berlin'
  | 'Africa/Lagos'
  | 'Europe/Athens'
  | 'Africa/Cairo'
  | 'Europe/Moscow'
  | 'Asia/Riyadh'
  | 'Asia/Dubai'
  | 'Asia/Baku'
  | 'Asia/Karachi'
  | 'Asia/Tashkent'
  | 'Asia/Calcutta'
  | 'Asia/Dhaka'
  | 'Asia/Almaty'
  | 'Asia/Jakarta'
  | 'Asia/Bangkok'
  | 'Asia/Shanghai'
  | 'Asia/Singapore'
  | 'Asia/Tokyo'
  | 'Asia/Seoul'
  | 'Australia/Brisbane'
  | 'Australia/Sydney'
  | 'Pacific/Guam'
  | 'Pacific/Noumea'
  | 'Pacific/Auckland'
  | 'Pacific/Fiji';

export interface Config {
  auth: {
    users: UserAuthOperations;
  };
  blocks: {};
  collections: {
    users: User;
    media: Media;
    shops: Shop;
    'feature-flags': FeatureFlag;
    pages: Page;
    articles: Article;
    productMetadata: ProductMetadatum;
    collectionMetadata: CollectionMetadatum;
    reviews: Review;
    header: Header;
    footer: Footer;
    businessData: BusinessDatum;
    'payload-kv': PayloadKv;
    'payload-locked-documents': PayloadLockedDocument;
    'payload-preferences': PayloadPreference;
    'payload-migrations': PayloadMigration;
  };
  collectionsJoins: {};
  collectionsSelect: {
    users: UsersSelect<false> | UsersSelect<true>;
    media: MediaSelect<false> | MediaSelect<true>;
    shops: ShopsSelect<false> | ShopsSelect<true>;
    'feature-flags': FeatureFlagsSelect<false> | FeatureFlagsSelect<true>;
    pages: PagesSelect<false> | PagesSelect<true>;
    articles: ArticlesSelect<false> | ArticlesSelect<true>;
    productMetadata: ProductMetadataSelect<false> | ProductMetadataSelect<true>;
    collectionMetadata: CollectionMetadataSelect<false> | CollectionMetadataSelect<true>;
    reviews: ReviewsSelect<false> | ReviewsSelect<true>;
    header: HeaderSelect<false> | HeaderSelect<true>;
    footer: FooterSelect<false> | FooterSelect<true>;
    businessData: BusinessDataSelect<false> | BusinessDataSelect<true>;
    'payload-kv': PayloadKvSelect<false> | PayloadKvSelect<true>;
    'payload-locked-documents': PayloadLockedDocumentsSelect<false> | PayloadLockedDocumentsSelect<true>;
    'payload-preferences': PayloadPreferencesSelect<false> | PayloadPreferencesSelect<true>;
    'payload-migrations': PayloadMigrationsSelect<false> | PayloadMigrationsSelect<true>;
  };
  db: {
    defaultIDType: string;
  };
  fallbackLocale:
    | ('false' | 'none' | 'null')
    | false
    | null
    | ('en-US' | 'sv' | 'de' | 'es' | 'fr' | 'no')
    | ('en-US' | 'sv' | 'de' | 'es' | 'fr' | 'no')[];
  globals: {};
  globalsSelect: {};
  locale: 'en-US' | 'sv' | 'de' | 'es' | 'fr' | 'no';
  widgets: {
    collections: CollectionsWidget;
  };
  user: User;
  jobs: {
    tasks: unknown;
    workflows: unknown;
  };
}
export interface UserAuthOperations {
  forgotPassword: {
    email: string;
    password: string;
  };
  login: {
    email: string;
    password: string;
  };
  registerFirstUser: {
    email: string;
    password: string;
  };
  unlock: {
    email: string;
    password: string;
  };
}

export interface User {
    id: string;
    role: 'admin' | 'editor';
    tenants?: Array<{ tenant: string | Shop; id?: string | null }> | null;
    updatedAt: string;
    createdAt: string;
    email: string;
    resetPasswordToken?: string | null;
    resetPasswordExpiration?: string | null;
    salt?: string | null;
    hash?: string | null;
    loginAttempts?: number | null;
    lockUntil?: string | null;
    sessions?: Array<{ id: string; createdAt?: string | null; expiresAt: string }> | null;
    password?: string | null;
    collection: 'users';
}
export interface Media {
    id: string;
    tenant?: (string | null) | Shop;
    alt: string;
    caption?: string | null;
    updatedAt: string;
    createdAt: string;
    url?: string | null;
    thumbnailURL?: string | null;
    filename?: string | null;
    mimeType?: string | null;
    filesize?: number | null;
    width?: number | null;
    height?: number | null;
    focalX?: number | null;
    focalY?: number | null;
    sizes?: { thumbnail?: { url?: string | null; width?: number | null; height?: number | null; mimeType?: string | null; filesize?: number | null; filename?: string | null }; card?: { url?: string | null; width?: number | null; height?: number | null; mimeType?: string | null; filesize?: number | null; filename?: string | null }; feature?: { url?: string | null; width?: number | null; height?: number | null; mimeType?: string | null; filesize?: number | null; filename?: string | null }; hero?: { url?: string | null; width?: number | null; height?: number | null; mimeType?: string | null; filesize?: number | null; filename?: string | null } };
}
export interface Shop {
    id: string;
    name: string;
    description?: string | null;
    domain: string;
    alternativeDomains?: string[] | null;
    i18n: {
        defaultLocale: string;
    };
    design: {
        header: {
            logo: {
                src: string;
                alt: string;
                width: number;
                height: number;
            };
        };
        accents?: Array<{
            type: 'primary' | 'secondary';
            color: string;
            foreground: string;
            id?: string | null;
        }> | null;
    };
    theme?: {
        colors?: {
            background?: string | null;
            foreground?: string | null;
            accents?: Array<{
                type: 'primary' | 'secondary';
                color: string;
                foreground: string;
                id?: string | null;
            }> | null;
            accentPrimaryLight?: string | null;
            accentPrimaryDark?: string | null;
            accentSecondaryLight?: string | null;
            accentSecondaryDark?: string | null;
            surface?: {
                base?: string | null;
                raised?: string | null;
                sunken?: string | null;
            };
            text?: {
                default?: string | null;
                muted?: string | null;
            };
            border?: {
                default?: string | null;
                strong?: string | null;
            };
            state?: {
                sale?: string | null;
                danger?: string | null;
                success?: string | null;
                info?: string | null;
            };
            focusRing?: string | null;
        };
        typography?: {
            fontFamily?: ('public-sans' | 'inter' | 'roboto' | 'open-sans' | 'lato' | 'montserrat' | 'poppins' | 'nunito' | 'work-sans' | 'source-serif-4' | 'lora' | 'playfair-display' | 'merriweather') | null;
            headingFamily?: ('public-sans' | 'inter' | 'roboto' | 'open-sans' | 'lato' | 'montserrat' | 'poppins' | 'nunito' | 'work-sans' | 'source-serif-4' | 'lora' | 'playfair-display' | 'merriweather') | null;
            fontWeights?: {
                normal?: number | null;
                medium?: number | null;
                semibold?: number | null;
                bold?: number | null;
            };
            scale?: {
                xs?: string | null;
                sm?: string | null;
                base?: string | null;
                lg?: string | null;
                xl?: string | null;
            };
        };
        radii?: {
            block?: string | null;
            blockLarge?: string | null;
            blockSmall?: string | null;
            blockTiny?: string | null;
        };
        spacing?: {
            blockPadding?: string | null;
            blockSpacer?: string | null;
        };
        elevation?: {
            card?: string | null;
            cardHover?: string | null;
            panel?: string | null;
        };
        productCard?: {
            bg?: string | null;
            borderColor?: string | null;
            borderWidth?: string | null;
            radius?: string | null;
            padding?: string | null;
            gap?: string | null;
            shadow?: string | null;
            shadowHover?: string | null;
            minWidth?: string | null;
            maxWidth?: string | null;
            gridAlign?: string | null;
            searchImageWidth?: string | null;
            imageRadius?: string | null;
            imagePadding?: string | null;
            imageFit?: string | null;
            imageHoverSwap?: string | null;
            imageSizes?: string | null;
            aspectVertical?: string | null;
            aspectHorizontal?: string | null;
            aspectHorizontalSquare?: string | null;
            aspectMicro?: string | null;
            vendorColor?: string | null;
            vendorSize?: string | null;
            titleColor?: string | null;
            titleSize?: string | null;
            titleWeight?: number | null;
            titleLineClamp?: number | null;
            priceColor?: string | null;
            priceSize?: string | null;
            priceWeight?: number | null;
            compareColor?: string | null;
            urgencyColor?: string | null;
            urgencyThreshold?: number | null;
            eyebrowTracking?: string | null;
            swatchSize?: string | null;
            swatchGap?: string | null;
            swatchRingColor?: string | null;
            swatchHitPadding?: string | null;
            chipBg?: string | null;
            chipColor?: string | null;
            chipBorder?: string | null;
            chipActiveBg?: string | null;
            chipActiveColor?: string | null;
            chipPaddingY?: string | null;
            chipPaddingX?: string | null;
            moreBg?: string | null;
            moreColor?: string | null;
            moreSize?: string | null;
            moreWeight?: number | null;
            moreMinSize?: string | null;
            ctaBg?: string | null;
            ctaColor?: string | null;
            ctaRadius?: string | null;
            ctaPaddingY?: string | null;
            ctaHeight?: string | null;
            ctaPlacement?: string | null;
            ctaPillPosition?: string | null;
            ctaPillLabel?: string | null;
            ctaPillIcon?: string | null;
            ctaPillReveal?: string | null;
            ctaInlineStyle?: string | null;
            fastPathDot?: string | null;
            fastPathSingleVariant?: string | null;
            quickAddPresentation?: string | null;
            overlayBg?: string | null;
            overlayRadius?: string | null;
            overlayBorderColor?: string | null;
            overlayShadow?: string | null;
            overlayWidth?: string | null;
            overlayMaxHeight?: string | null;
            overlayPadding?: string | null;
            oosOpacity?: number | null;
            oosImageSaturate?: number | null;
            motionEase?: string | null;
            motionFast?: string | null;
            motionBase?: string | null;
            motionPickerIn?: string | null;
            motionPickerOut?: string | null;
            motionHoverDuration?: string | null;
            motionHoverEase?: string | null;
            motionImageSwapDuration?: string | null;
            motionOverlayInDuration?: string | null;
            motionOverlayInEase?: string | null;
            saleStyle?: string | null;
            saleStrikeColor?: string | null;
            saleStrikeAngle?: string | null;
            saleStrikeExtend?: string | null;
            saleCurrentColor?: string | null;
            saleShowSavingsLine?: string | null;
            saleBadgeStyle?: string | null;
            saleBadgePosition?: string | null;
            saleBadgeText?: string | null;
            saleBadgeMinDiscount?: number | null;
            saleBadgeAllowOverlap?: boolean | null;
        };
    };
    commerce?: {
        maxQuantity?: number | null;
        processingTimeInDays?: number | null;
    };
    icons?: {
        favicon?: {
            width?: number | null;
            height?: number | null;
            src?: string | null;
            alt?: string | null;
        };
    };
    commerceProvider: {
        type: 'shopify' | 'stripe';
        storefrontId?: string | null;
        domain?: string | null;
        id?: string | null;
        authentication?: {
            token?: string | null;
            publicToken?: string | null;
            domain?: string | null;
            customers?: {
                id?: string | null;
                clientId?: string | null;
                clientSecret?: string | null;
            };
        };
    };
    integrations?: {
        judgeme?: {
            publicToken?: string | null;
        };
    };
    thirdParty?: { [k: string]: unknown } | unknown[] | string | number | boolean | null;
    featureFlags?: Array<{
        flag?: (string | null) | FeatureFlag;
        id?: string | null;
    }> | null;
    collaborators?: Array<{
        user?: string | null;
        permissions?: string[] | null;
        id?: string | null;
    }> | null;
    updatedAt: string;
    createdAt: string;
}
export interface FeatureFlag {
    id: string;
    key: string;
    kind?: ('behavior' | 'section') | null;
    description?: string | null;
    defaultValue: { [k: string]: unknown } | unknown[] | string | number | boolean | null;
    options?: Array<{
        label: string;
        value: { [k: string]: unknown } | unknown[] | string | number | boolean | null;
        id?: string | null;
    }> | null;
    targeting?: Array<{
        rule: string;
        params: { [k: string]: unknown } | unknown[] | string | number | boolean | null;
        value: { [k: string]: unknown } | unknown[] | string | number | boolean | null;
        description?: string | null;
        id?: string | null;
    }> | null;
    updatedAt: string;
    createdAt: string;
}
export interface Page {
    id: string;
    tenant?: (string | null) | Shop;
    title: string;
    slug: string;
    blocks?: Array<ColumnsBlock | AlertBlock | BannerBlock | CollectionBlock | HtmlBlock | MediaGridBlock | OverviewBlock | RichTextBlock | VendorsBlock> | null;
    seo?: {
        title?: string | null;
        description?: string | null;
        keywords?: string[] | null;
        image?: (string | null) | Media;
        noindex?: boolean | null;
    };
    updatedAt: string;
    createdAt: string;
    _status?: ('draft' | 'published') | null;
}
export interface Article {
    id: string;
    tenant?: (string | null) | Shop;
    title: string;
    slug: string;
    author: string;
    publishedAt?: string | null;
    cover?: (string | null) | Media;
    excerpt?: string | null;
    body?: { [k: string]: unknown } | unknown[] | string | number | boolean | null;
    tags?: string[] | null;
    seo?: {
        title?: string | null;
        description?: string | null;
        keywords?: string[] | null;
        image?: (string | null) | Media;
        noindex?: boolean | null;
    };
    updatedAt: string;
    createdAt: string;
    _status?: ('draft' | 'published') | null;
}
export interface ProductMetadatum {
    id: string;
    tenant?: (string | null) | Shop;
    shopifyHandle: string;
    descriptionOverride?: { [k: string]: unknown } | unknown[] | string | number | boolean | null;
    blocks?: Array<ColumnsBlock | AlertBlock | BannerBlock | CollectionBlock | HtmlBlock | MediaGridBlock | OverviewBlock | RichTextBlock | VendorsBlock> | null;
    seo?: {
        title?: string | null;
        description?: string | null;
        keywords?: string[] | null;
        image?: (string | null) | Media;
        noindex?: boolean | null;
    };
    updatedAt: string;
    createdAt: string;
    _status?: ('draft' | 'published') | null;
}
export interface CollectionMetadatum {
    id: string;
    tenant?: (string | null) | Shop;
    shopifyHandle: string;
    descriptionOverride?: { [k: string]: unknown } | unknown[] | string | number | boolean | null;
    blocks?: Array<ColumnsBlock | AlertBlock | BannerBlock | CollectionBlock | HtmlBlock | MediaGridBlock | OverviewBlock | RichTextBlock | VendorsBlock> | null;
    seo?: {
        title?: string | null;
        description?: string | null;
        keywords?: string[] | null;
        image?: (string | null) | Media;
        noindex?: boolean | null;
    };
    updatedAt: string;
    createdAt: string;
    _status?: ('draft' | 'published') | null;
}
export interface Review {
    id: string;
    tenant?: (string | null) | Shop;
    shop: string | Shop;
    updatedAt: string;
    createdAt: string;
}
export interface Header {
    id: string;
    tenant?: (string | null) | Shop;
    logo?: (string | null) | Media;
    logoLink?: string | null;
    items?: Array<{
        link?: {
            kind?: ('page' | 'article' | 'product' | 'collection' | 'external' | 'anchor') | null;
            page?: (string | null) | Page;
            article?: (string | null) | Article;
            product?: (string | null) | ProductMetadatum;
            collectionRef?: (string | null) | CollectionMetadatum;
            url?: string | null;
            label?: string | null;
            openInNewTab?: boolean | null;
        };
        variant?: ('editorial-columns' | 'compact-list' | 'featured-promo') | null;
        image?: (string | null) | Media;
        description?: string | null;
        backgroundColor?: string | null;
        items?: Array<{
            link?: {
                kind?: ('page' | 'article' | 'product' | 'collection' | 'external' | 'anchor') | null;
                page?: (string | null) | Page;
                article?: (string | null) | Article;
                product?: (string | null) | ProductMetadatum;
                collectionRef?: (string | null) | CollectionMetadatum;
                url?: string | null;
                label?: string | null;
                openInNewTab?: boolean | null;
            };
            image?: (string | null) | Media;
            description?: string | null;
            backgroundColor?: string | null;
            items?: Array<{
                link?: {
                    kind?: ('page' | 'article' | 'product' | 'collection' | 'external' | 'anchor') | null;
                    page?: (string | null) | Page;
                    article?: (string | null) | Article;
                    product?: (string | null) | ProductMetadatum;
                    collectionRef?: (string | null) | CollectionMetadatum;
                    url?: string | null;
                    label?: string | null;
                    openInNewTab?: boolean | null;
                };
                image?: (string | null) | Media;
                description?: string | null;
                backgroundColor?: string | null;
                items?: Array<{
                    link?: {
                        kind?: ('page' | 'article' | 'product' | 'collection' | 'external' | 'anchor') | null;
                        page?: (string | null) | Page;
                        article?: (string | null) | Article;
                        product?: (string | null) | ProductMetadatum;
                        collectionRef?: (string | null) | CollectionMetadatum;
                        url?: string | null;
                        label?: string | null;
                        openInNewTab?: boolean | null;
                    };
                    image?: (string | null) | Media;
                    description?: string | null;
                    backgroundColor?: string | null;
                    items?: Array<{
                        link?: {
                            kind?: ('page' | 'article' | 'product' | 'collection' | 'external' | 'anchor') | null;
                            page?: (string | null) | Page;
                            article?: (string | null) | Article;
                            product?: (string | null) | ProductMetadatum;
                            collectionRef?: (string | null) | CollectionMetadatum;
                            url?: string | null;
                            label?: string | null;
                            openInNewTab?: boolean | null;
                        };
                        image?: (string | null) | Media;
                        description?: string | null;
                        backgroundColor?: string | null;
                        items?: Array<{
                            link?: {
                                kind?: ('page' | 'article' | 'product' | 'collection' | 'external' | 'anchor') | null;
                                page?: (string | null) | Page;
                                article?: (string | null) | Article;
                                product?: (string | null) | ProductMetadatum;
                                collectionRef?: (string | null) | CollectionMetadatum;
                                url?: string | null;
                                label?: string | null;
                                openInNewTab?: boolean | null;
                            };
                            image?: (string | null) | Media;
                            description?: string | null;
                            backgroundColor?: string | null;
                            id?: string | null;
                        }> | null;
                        id?: string | null;
                    }> | null;
                    id?: string | null;
                }> | null;
                id?: string | null;
            }> | null;
            id?: string | null;
        }> | null;
        id?: string | null;
    }> | null;
    localeSwitcher?: {
        enabled?: boolean | null;
        label?: string | null;
    };
    cta?: {
        kind?: ('page' | 'article' | 'product' | 'collection' | 'external' | 'anchor') | null;
        page?: (string | null) | Page;
        article?: (string | null) | Article;
        product?: (string | null) | ProductMetadatum;
        collectionRef?: (string | null) | CollectionMetadatum;
        url?: string | null;
        label?: string | null;
        openInNewTab?: boolean | null;
    };
    updatedAt: string;
    createdAt: string;
    _status?: ('draft' | 'published') | null;
}
export interface Footer {
    id: string;
    tenant?: (string | null) | Shop;
    sections?: Array<{
        title: string;
        links?: Array<{
            link?: {
                kind?: ('page' | 'article' | 'product' | 'collection' | 'external' | 'anchor') | null;
                page?: (string | null) | Page;
                article?: (string | null) | Article;
                product?: (string | null) | ProductMetadatum;
                collectionRef?: (string | null) | CollectionMetadatum;
                url?: string | null;
                label?: string | null;
                openInNewTab?: boolean | null;
            };
            id?: string | null;
        }> | null;
        id?: string | null;
    }> | null;
    social?: Array<{
        platform: 'instagram' | 'facebook' | 'tiktok' | 'youtube' | 'x' | 'linkedin';
        url: string;
        id?: string | null;
    }> | null;
    legal?: Array<{
        link?: {
            kind?: ('page' | 'article' | 'product' | 'collection' | 'external' | 'anchor') | null;
            page?: (string | null) | Page;
            article?: (string | null) | Article;
            product?: (string | null) | ProductMetadatum;
            collectionRef?: (string | null) | CollectionMetadatum;
            url?: string | null;
            label?: string | null;
            openInNewTab?: boolean | null;
        };
        id?: string | null;
    }> | null;
    copyrightLine?: string | null;
    updatedAt: string;
    createdAt: string;
    _status?: ('draft' | 'published') | null;
}
export interface BusinessDatum {
    id: string;
    tenant?: (string | null) | Shop;
    legalName?: string | null;
    supportEmail?: string | null;
    supportPhone?: string | null;
    address?: {
        line1?: string | null;
        line2?: string | null;
        city?: string | null;
        region?: string | null;
        postalCode?: string | null;
        country?: string | null;
    };
    profiles?: Array<{
        platform: string;
        handle: string;
        url?: string | null;
        id?: string | null;
    }> | null;
    updatedAt: string;
    createdAt: string;
    _status?: ('draft' | 'published') | null;
}
export interface ColumnsBlock {
    columns?: Array<{
        width?: ('auto' | '1/3' | '1/2' | '2/3' | 'full') | null;
        content?: Array<AlertBlock | BannerBlock | CollectionBlock | HtmlBlock | MediaGridBlock | OverviewBlock | RichTextBlock | VendorsBlock> | null;
        id?: string | null;
    }> | null;
    id?: string | null;
    blockName?: string | null;
    blockType: 'columns';
}
export interface AlertBlock {
    severity: 'info' | 'success' | 'warning' | 'error';
    title: string;
    body?: string | null;
    dismissible?: boolean | null;
    id?: string | null;
    blockName?: string | null;
    blockType: 'alert';
}
export interface BannerBlock {
    heading: string;
    subheading?: string | null;
    background?: (string | null) | Media;
    cta?: {
        kind?: ('page' | 'article' | 'product' | 'collection' | 'external' | 'anchor') | null;
        page?: (string | null) | Page;
        article?: (string | null) | Article;
        product?: (string | null) | ProductMetadatum;
        collectionRef?: (string | null) | CollectionMetadatum;
        url?: string | null;
        label?: string | null;
        openInNewTab?: boolean | null;
    };
    alignment?: ('left' | 'center' | 'right') | null;
    id?: string | null;
    blockName?: string | null;
    blockType: 'banner';
}
export interface CollectionBlock {
    handle: string;
    title?: string | null;
    layout?: ('grid' | 'carousel') | null;
    limit?: number | null;
    id?: string | null;
    blockName?: string | null;
    blockType: 'collection';
}
export interface HtmlBlock {
    html: string;
    id?: string | null;
    blockName?: string | null;
    blockType: 'html';
}
export interface MediaGridBlock {
    itemType: 'image' | 'icon';
    columns?: number | null;
    items?: Array<{
        image?: (string | null) | Media;
        caption?: string | null;
        link?: {
            kind?: ('page' | 'article' | 'product' | 'collection' | 'external' | 'anchor') | null;
            page?: (string | null) | Page;
            article?: (string | null) | Article;
            product?: (string | null) | ProductMetadatum;
            collectionRef?: (string | null) | CollectionMetadatum;
            url?: string | null;
            label?: string | null;
            openInNewTab?: boolean | null;
        };
        id?: string | null;
    }> | null;
    id?: string | null;
    blockName?: string | null;
    blockType: 'media-grid';
}
export interface OverviewBlock {
    source: 'collection' | 'latest' | 'featured';
    collectionHandle?: string | null;
    title?: string | null;
    limit?: number | null;
    id?: string | null;
    blockName?: string | null;
    blockType: 'overview';
}
export interface RichTextBlock {
    body?: { [k: string]: unknown } | unknown[] | string | number | boolean | null;
    collapsible?: boolean | null;
    collapsedByDefault?: boolean | null;
    collapseLabel?: string | null;
    id?: string | null;
    blockName?: string | null;
    blockType: 'rich-text';
}
export interface VendorsBlock {
    title?: string | null;
    maxVendors?: number | null;
    id?: string | null;
    blockName?: string | null;
    blockType: 'vendors';
}

/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "payload-kv".
 */
export interface PayloadKv {
  id: string;
  key: string;
  data:
    | {
        [k: string]: unknown;
      }
    | unknown[]
    | string
    | number
    | boolean
    | null;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "payload-locked-documents".
 */
export interface PayloadLockedDocument {
  id: string;
  document?:
    | ({
        relationTo: 'users';
        value: string | User;
      } | null)
    | ({
        relationTo: 'media';
        value: string | Media;
      } | null)
    | ({
        relationTo: 'shops';
        value: string | Shop;
      } | null)
    | ({
        relationTo: 'feature-flags';
        value: string | FeatureFlag;
      } | null)
    | ({
        relationTo: 'pages';
        value: string | Page;
      } | null)
    | ({
        relationTo: 'articles';
        value: string | Article;
      } | null)
    | ({
        relationTo: 'productMetadata';
        value: string | ProductMetadatum;
      } | null)
    | ({
        relationTo: 'collectionMetadata';
        value: string | CollectionMetadatum;
      } | null)
    | ({
        relationTo: 'reviews';
        value: string | Review;
      } | null)
    | ({
        relationTo: 'header';
        value: string | Header;
      } | null)
    | ({
        relationTo: 'footer';
        value: string | Footer;
      } | null)
    | ({
        relationTo: 'businessData';
        value: string | BusinessDatum;
      } | null);
  globalSlug?: string | null;
  user: {
    relationTo: 'users';
    value: string | User;
  };
  updatedAt: string;
  createdAt: string;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "payload-preferences".
 */
export interface PayloadPreference {
  id: string;
  user: {
    relationTo: 'users';
    value: string | User;
  };
  key?: string | null;
  value?:
    | {
        [k: string]: unknown;
      }
    | unknown[]
    | string
    | number
    | boolean
    | null;
  updatedAt: string;
  createdAt: string;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "payload-migrations".
 */
export interface PayloadMigration {
  id: string;
  name?: string | null;
  batch?: number | null;
  updatedAt: string;
  createdAt: string;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "users_select".
 */
export interface UsersSelect<T extends boolean = true> {
  role?: T;
  tenants?:
    | T
    | {
        tenant?: T;
        id?: T;
      };
  updatedAt?: T;
  createdAt?: T;
  email?: T;
  resetPasswordToken?: T;
  resetPasswordExpiration?: T;
  salt?: T;
  hash?: T;
  loginAttempts?: T;
  lockUntil?: T;
  sessions?:
    | T
    | {
        id?: T;
        createdAt?: T;
        expiresAt?: T;
      };
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "media_select".
 */
export interface MediaSelect<T extends boolean = true> {
  tenant?: T;
  alt?: T;
  caption?: T;
  updatedAt?: T;
  createdAt?: T;
  url?: T;
  thumbnailURL?: T;
  filename?: T;
  mimeType?: T;
  filesize?: T;
  width?: T;
  height?: T;
  focalX?: T;
  focalY?: T;
  sizes?:
    | T
    | {
        thumbnail?:
          | T
          | {
              url?: T;
              width?: T;
              height?: T;
              mimeType?: T;
              filesize?: T;
              filename?: T;
            };
        card?:
          | T
          | {
              url?: T;
              width?: T;
              height?: T;
              mimeType?: T;
              filesize?: T;
              filename?: T;
            };
        feature?:
          | T
          | {
              url?: T;
              width?: T;
              height?: T;
              mimeType?: T;
              filesize?: T;
              filename?: T;
            };
        hero?:
          | T
          | {
              url?: T;
              width?: T;
              height?: T;
              mimeType?: T;
              filesize?: T;
              filename?: T;
            };
      };
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "shops_select".
 */
export interface ShopsSelect<T extends boolean = true> {
  name?: T;
  description?: T;
  domain?: T;
  alternativeDomains?: T;
  i18n?:
    | T
    | {
        defaultLocale?: T;
      };
  design?:
    | T
    | {
        header?:
          | T
          | {
              logo?:
                | T
                | {
                    src?: T;
                    alt?: T;
                    width?: T;
                    height?: T;
                  };
            };
        accents?:
          | T
          | {
              type?: T;
              color?: T;
              foreground?: T;
              id?: T;
            };
      };
  theme?:
    | T
    | {
        colors?:
          | T
          | {
              background?: T;
              foreground?: T;
              accents?:
                | T
                | {
                    type?: T;
                    color?: T;
                    foreground?: T;
                    id?: T;
                  };
              accentPrimaryLight?: T;
              accentPrimaryDark?: T;
              accentSecondaryLight?: T;
              accentSecondaryDark?: T;
              surface?:
                | T
                | {
                    base?: T;
                    raised?: T;
                    sunken?: T;
                  };
              text?:
                | T
                | {
                    default?: T;
                    muted?: T;
                  };
              border?:
                | T
                | {
                    default?: T;
                    strong?: T;
                  };
              state?:
                | T
                | {
                    sale?: T;
                    danger?: T;
                    success?: T;
                    info?: T;
                  };
              focusRing?: T;
            };
        typography?:
          | T
          | {
              fontFamily?: T;
              headingFamily?: T;
              fontWeights?:
                | T
                | {
                    normal?: T;
                    medium?: T;
                    semibold?: T;
                    bold?: T;
                  };
              scale?:
                | T
                | {
                    xs?: T;
                    sm?: T;
                    base?: T;
                    lg?: T;
                    xl?: T;
                  };
            };
        radii?:
          | T
          | {
              block?: T;
              blockLarge?: T;
              blockSmall?: T;
              blockTiny?: T;
            };
        spacing?:
          | T
          | {
              blockPadding?: T;
              blockSpacer?: T;
            };
        elevation?:
          | T
          | {
              card?: T;
              cardHover?: T;
              panel?: T;
            };
        productCard?:
          | T
          | {
              bg?: T;
              borderColor?: T;
              borderWidth?: T;
              radius?: T;
              padding?: T;
              gap?: T;
              shadow?: T;
              shadowHover?: T;
              minWidth?: T;
              maxWidth?: T;
              gridAlign?: T;
              searchImageWidth?: T;
              imageRadius?: T;
              imagePadding?: T;
              imageFit?: T;
              imageHoverSwap?: T;
              imageSizes?: T;
              aspectVertical?: T;
              aspectHorizontal?: T;
              aspectHorizontalSquare?: T;
              aspectMicro?: T;
              vendorColor?: T;
              vendorSize?: T;
              titleColor?: T;
              titleSize?: T;
              titleWeight?: T;
              titleLineClamp?: T;
              priceColor?: T;
              priceSize?: T;
              priceWeight?: T;
              compareColor?: T;
              urgencyColor?: T;
              urgencyThreshold?: T;
              eyebrowTracking?: T;
              swatchSize?: T;
              swatchGap?: T;
              swatchRingColor?: T;
              swatchHitPadding?: T;
              chipBg?: T;
              chipColor?: T;
              chipBorder?: T;
              chipActiveBg?: T;
              chipActiveColor?: T;
              chipPaddingY?: T;
              chipPaddingX?: T;
              moreBg?: T;
              moreColor?: T;
              moreSize?: T;
              moreWeight?: T;
              moreMinSize?: T;
              ctaBg?: T;
              ctaColor?: T;
              ctaRadius?: T;
              ctaPaddingY?: T;
              ctaHeight?: T;
              ctaPlacement?: T;
              ctaPillPosition?: T;
              ctaPillLabel?: T;
              ctaPillIcon?: T;
              ctaPillReveal?: T;
              ctaInlineStyle?: T;
              fastPathDot?: T;
              fastPathSingleVariant?: T;
              quickAddPresentation?: T;
              overlayBg?: T;
              overlayRadius?: T;
              overlayBorderColor?: T;
              overlayShadow?: T;
              overlayWidth?: T;
              overlayMaxHeight?: T;
              overlayPadding?: T;
              oosOpacity?: T;
              oosImageSaturate?: T;
              motionEase?: T;
              motionFast?: T;
              motionBase?: T;
              motionPickerIn?: T;
              motionPickerOut?: T;
              motionHoverDuration?: T;
              motionHoverEase?: T;
              motionImageSwapDuration?: T;
              motionOverlayInDuration?: T;
              motionOverlayInEase?: T;
              saleStyle?: T;
              saleStrikeColor?: T;
              saleStrikeAngle?: T;
              saleStrikeExtend?: T;
              saleCurrentColor?: T;
              saleShowSavingsLine?: T;
              saleBadgeStyle?: T;
              saleBadgePosition?: T;
              saleBadgeText?: T;
              saleBadgeMinDiscount?: T;
              saleBadgeAllowOverlap?: T;
            };
      };
  commerce?:
    | T
    | {
        maxQuantity?: T;
        processingTimeInDays?: T;
      };
  icons?:
    | T
    | {
        favicon?:
          | T
          | {
              width?: T;
              height?: T;
              src?: T;
              alt?: T;
            };
      };
  commerceProvider?:
    | T
    | {
        type?: T;
        storefrontId?: T;
        domain?: T;
        id?: T;
        authentication?:
          | T
          | {
              token?: T;
              publicToken?: T;
              domain?: T;
              customers?:
                | T
                | {
                    id?: T;
                    clientId?: T;
                    clientSecret?: T;
                  };
            };
      };
  integrations?:
    | T
    | {
        judgeme?:
          | T
          | {
              publicToken?: T;
            };
      };
  thirdParty?: T;
  featureFlags?:
    | T
    | {
        flag?: T;
        id?: T;
      };
  collaborators?:
    | T
    | {
        user?: T;
        permissions?: T;
        id?: T;
      };
  updatedAt?: T;
  createdAt?: T;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "feature-flags_select".
 */
export interface FeatureFlagsSelect<T extends boolean = true> {
  key?: T;
  kind?: T;
  description?: T;
  defaultValue?: T;
  options?:
    | T
    | {
        label?: T;
        value?: T;
        id?: T;
      };
  targeting?:
    | T
    | {
        rule?: T;
        params?: T;
        value?: T;
        description?: T;
        id?: T;
      };
  updatedAt?: T;
  createdAt?: T;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "pages_select".
 */
export interface PagesSelect<T extends boolean = true> {
  tenant?: T;
  title?: T;
  slug?: T;
  blocks?:
    | T
    | {
        columns?: T | ColumnsBlockSelect<T>;
        alert?: T | AlertBlockSelect<T>;
        banner?: T | BannerBlockSelect<T>;
        collection?: T | CollectionBlockSelect<T>;
        html?: T | HtmlBlockSelect<T>;
        'media-grid'?: T | MediaGridBlockSelect<T>;
        overview?: T | OverviewBlockSelect<T>;
        'rich-text'?: T | RichTextBlockSelect<T>;
        vendors?: T | VendorsBlockSelect<T>;
      };
  seo?:
    | T
    | {
        title?: T;
        description?: T;
        keywords?: T;
        image?: T;
        noindex?: T;
      };
  updatedAt?: T;
  createdAt?: T;
  _status?: T;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "ColumnsBlock_select".
 */
export interface ColumnsBlockSelect<T extends boolean = true> {
  columns?:
    | T
    | {
        width?: T;
        content?:
          | T
          | {
              alert?: T | AlertBlockSelect<T>;
              banner?: T | BannerBlockSelect<T>;
              collection?: T | CollectionBlockSelect<T>;
              html?: T | HtmlBlockSelect<T>;
              'media-grid'?: T | MediaGridBlockSelect<T>;
              overview?: T | OverviewBlockSelect<T>;
              'rich-text'?: T | RichTextBlockSelect<T>;
              vendors?: T | VendorsBlockSelect<T>;
            };
        id?: T;
      };
  id?: T;
  blockName?: T;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "AlertBlock_select".
 */
export interface AlertBlockSelect<T extends boolean = true> {
  severity?: T;
  title?: T;
  body?: T;
  dismissible?: T;
  id?: T;
  blockName?: T;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "BannerBlock_select".
 */
export interface BannerBlockSelect<T extends boolean = true> {
  heading?: T;
  subheading?: T;
  background?: T;
  cta?:
    | T
    | {
        kind?: T;
        page?: T;
        article?: T;
        product?: T;
        collectionRef?: T;
        url?: T;
        label?: T;
        openInNewTab?: T;
      };
  alignment?: T;
  id?: T;
  blockName?: T;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "CollectionBlock_select".
 */
export interface CollectionBlockSelect<T extends boolean = true> {
  handle?: T;
  title?: T;
  layout?: T;
  limit?: T;
  id?: T;
  blockName?: T;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "HtmlBlock_select".
 */
export interface HtmlBlockSelect<T extends boolean = true> {
  html?: T;
  id?: T;
  blockName?: T;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "MediaGridBlock_select".
 */
export interface MediaGridBlockSelect<T extends boolean = true> {
  itemType?: T;
  columns?: T;
  items?:
    | T
    | {
        image?: T;
        caption?: T;
        link?:
          | T
          | {
              kind?: T;
              page?: T;
              article?: T;
              product?: T;
              collectionRef?: T;
              url?: T;
              label?: T;
              openInNewTab?: T;
            };
        id?: T;
      };
  id?: T;
  blockName?: T;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "OverviewBlock_select".
 */
export interface OverviewBlockSelect<T extends boolean = true> {
  source?: T;
  collectionHandle?: T;
  title?: T;
  limit?: T;
  id?: T;
  blockName?: T;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "RichTextBlock_select".
 */
export interface RichTextBlockSelect<T extends boolean = true> {
  body?: T;
  collapsible?: T;
  collapsedByDefault?: T;
  collapseLabel?: T;
  id?: T;
  blockName?: T;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "VendorsBlock_select".
 */
export interface VendorsBlockSelect<T extends boolean = true> {
  title?: T;
  maxVendors?: T;
  id?: T;
  blockName?: T;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "articles_select".
 */
export interface ArticlesSelect<T extends boolean = true> {
  tenant?: T;
  title?: T;
  slug?: T;
  author?: T;
  publishedAt?: T;
  cover?: T;
  excerpt?: T;
  body?: T;
  tags?: T;
  seo?:
    | T
    | {
        title?: T;
        description?: T;
        keywords?: T;
        image?: T;
        noindex?: T;
      };
  updatedAt?: T;
  createdAt?: T;
  _status?: T;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "productMetadata_select".
 */
export interface ProductMetadataSelect<T extends boolean = true> {
  tenant?: T;
  shopifyHandle?: T;
  descriptionOverride?: T;
  blocks?:
    | T
    | {
        columns?: T | ColumnsBlockSelect<T>;
        alert?: T | AlertBlockSelect<T>;
        banner?: T | BannerBlockSelect<T>;
        collection?: T | CollectionBlockSelect<T>;
        html?: T | HtmlBlockSelect<T>;
        'media-grid'?: T | MediaGridBlockSelect<T>;
        overview?: T | OverviewBlockSelect<T>;
        'rich-text'?: T | RichTextBlockSelect<T>;
        vendors?: T | VendorsBlockSelect<T>;
      };
  seo?:
    | T
    | {
        title?: T;
        description?: T;
        keywords?: T;
        image?: T;
        noindex?: T;
      };
  updatedAt?: T;
  createdAt?: T;
  _status?: T;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "collectionMetadata_select".
 */
export interface CollectionMetadataSelect<T extends boolean = true> {
  tenant?: T;
  shopifyHandle?: T;
  descriptionOverride?: T;
  blocks?:
    | T
    | {
        columns?: T | ColumnsBlockSelect<T>;
        alert?: T | AlertBlockSelect<T>;
        banner?: T | BannerBlockSelect<T>;
        collection?: T | CollectionBlockSelect<T>;
        html?: T | HtmlBlockSelect<T>;
        'media-grid'?: T | MediaGridBlockSelect<T>;
        overview?: T | OverviewBlockSelect<T>;
        'rich-text'?: T | RichTextBlockSelect<T>;
        vendors?: T | VendorsBlockSelect<T>;
      };
  seo?:
    | T
    | {
        title?: T;
        description?: T;
        keywords?: T;
        image?: T;
        noindex?: T;
      };
  updatedAt?: T;
  createdAt?: T;
  _status?: T;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "reviews_select".
 */
export interface ReviewsSelect<T extends boolean = true> {
  tenant?: T;
  shop?: T;
  updatedAt?: T;
  createdAt?: T;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "header_select".
 */
export interface HeaderSelect<T extends boolean = true> {
  tenant?: T;
  logo?: T;
  logoLink?: T;
  items?:
    | T
    | {
        link?:
          | T
          | {
              kind?: T;
              page?: T;
              article?: T;
              product?: T;
              collectionRef?: T;
              url?: T;
              label?: T;
              openInNewTab?: T;
            };
        variant?: T;
        image?: T;
        description?: T;
        backgroundColor?: T;
        items?:
          | T
          | {
              link?:
                | T
                | {
                    kind?: T;
                    page?: T;
                    article?: T;
                    product?: T;
                    collectionRef?: T;
                    url?: T;
                    label?: T;
                    openInNewTab?: T;
                  };
              image?: T;
              description?: T;
              backgroundColor?: T;
              items?:
                | T
                | {
                    link?:
                      | T
                      | {
                          kind?: T;
                          page?: T;
                          article?: T;
                          product?: T;
                          collectionRef?: T;
                          url?: T;
                          label?: T;
                          openInNewTab?: T;
                        };
                    image?: T;
                    description?: T;
                    backgroundColor?: T;
                    items?:
                      | T
                      | {
                          link?:
                            | T
                            | {
                                kind?: T;
                                page?: T;
                                article?: T;
                                product?: T;
                                collectionRef?: T;
                                url?: T;
                                label?: T;
                                openInNewTab?: T;
                              };
                          image?: T;
                          description?: T;
                          backgroundColor?: T;
                          items?:
                            | T
                            | {
                                link?:
                                  | T
                                  | {
                                      kind?: T;
                                      page?: T;
                                      article?: T;
                                      product?: T;
                                      collectionRef?: T;
                                      url?: T;
                                      label?: T;
                                      openInNewTab?: T;
                                    };
                                image?: T;
                                description?: T;
                                backgroundColor?: T;
                                items?:
                                  | T
                                  | {
                                      link?:
                                        | T
                                        | {
                                            kind?: T;
                                            page?: T;
                                            article?: T;
                                            product?: T;
                                            collectionRef?: T;
                                            url?: T;
                                            label?: T;
                                            openInNewTab?: T;
                                          };
                                      image?: T;
                                      description?: T;
                                      backgroundColor?: T;
                                      id?: T;
                                    };
                                id?: T;
                              };
                          id?: T;
                        };
                    id?: T;
                  };
              id?: T;
            };
        id?: T;
      };
  localeSwitcher?:
    | T
    | {
        enabled?: T;
        label?: T;
      };
  cta?:
    | T
    | {
        kind?: T;
        page?: T;
        article?: T;
        product?: T;
        collectionRef?: T;
        url?: T;
        label?: T;
        openInNewTab?: T;
      };
  updatedAt?: T;
  createdAt?: T;
  _status?: T;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "footer_select".
 */
export interface FooterSelect<T extends boolean = true> {
  tenant?: T;
  sections?:
    | T
    | {
        title?: T;
        links?:
          | T
          | {
              link?:
                | T
                | {
                    kind?: T;
                    page?: T;
                    article?: T;
                    product?: T;
                    collectionRef?: T;
                    url?: T;
                    label?: T;
                    openInNewTab?: T;
                  };
              id?: T;
            };
        id?: T;
      };
  social?:
    | T
    | {
        platform?: T;
        url?: T;
        id?: T;
      };
  legal?:
    | T
    | {
        link?:
          | T
          | {
              kind?: T;
              page?: T;
              article?: T;
              product?: T;
              collectionRef?: T;
              url?: T;
              label?: T;
              openInNewTab?: T;
            };
        id?: T;
      };
  copyrightLine?: T;
  updatedAt?: T;
  createdAt?: T;
  _status?: T;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "businessData_select".
 */
export interface BusinessDataSelect<T extends boolean = true> {
  tenant?: T;
  legalName?: T;
  supportEmail?: T;
  supportPhone?: T;
  address?:
    | T
    | {
        line1?: T;
        line2?: T;
        city?: T;
        region?: T;
        postalCode?: T;
        country?: T;
      };
  profiles?:
    | T
    | {
        platform?: T;
        handle?: T;
        url?: T;
        id?: T;
      };
  updatedAt?: T;
  createdAt?: T;
  _status?: T;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "payload-kv_select".
 */
export interface PayloadKvSelect<T extends boolean = true> {
  key?: T;
  data?: T;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "payload-locked-documents_select".
 */
export interface PayloadLockedDocumentsSelect<T extends boolean = true> {
  document?: T;
  globalSlug?: T;
  user?: T;
  updatedAt?: T;
  createdAt?: T;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "payload-preferences_select".
 */
export interface PayloadPreferencesSelect<T extends boolean = true> {
  user?: T;
  key?: T;
  value?: T;
  updatedAt?: T;
  createdAt?: T;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "payload-migrations_select".
 */
export interface PayloadMigrationsSelect<T extends boolean = true> {
  name?: T;
  batch?: T;
  updatedAt?: T;
  createdAt?: T;
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "collections_widget".
 */
export interface CollectionsWidget {
  data?: {
    [k: string]: unknown;
  };
  width: 'full';
}
/**
 * This interface was referenced by `Config`'s JSON-Schema
 * via the `definition` "auth".
 */
export interface Auth {
  [k: string]: unknown;
}

declare module 'payload' {
  export interface GeneratedTypes extends Config {}
}
