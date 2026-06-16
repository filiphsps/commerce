/**
 * This file was automatically generated from the CMS field descriptors by
 * `pnpm cms:gen` (packages/cms/scripts/cms-gen.ts). DO NOT EDIT BY
 * HAND — changes are overwritten on the next run, and CI's `cms:gen:check`
 * drift gate fails on any uncommitted divergence. Edit the field shapes in
 * scripts/codegen/content-shapes.ts (and the descriptors under src/fields /
 * src/descriptors) instead, then regenerate.
 */

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
export interface Search {
    id: string;
    tenant?: (string | null) | Shop;
    heading?: string | null;
    subheading?: string | null;
    popularSearches?: Array<{
        term: string;
        id?: string | null;
    }> | null;
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
    colorScheme?: ('dark' | 'light') | null;
    id?: string | null;
    blockName?: string | null;
    blockType: 'banner';
}
export interface CollectionBlock {
    handle: string;
    title?: string | null;
    layout?: { base: ('grid' | 'carousel'); sm?: ('grid' | 'carousel') | null; md?: ('grid' | 'carousel') | null; lg?: ('grid' | 'carousel') | null; xl?: ('grid' | 'carousel') | null; '2xl'?: ('grid' | 'carousel') | null } | null;
    limit?: number | null;
    defaultLayout?: ('grid' | 'carousel') | null;
    colorScheme?: ('light' | 'dark') | null;
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
