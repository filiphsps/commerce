// Code generated by Slice Machine. DO NOT EDIT.

import type * as prismic from '@prismicio/client';

type Simplify<T> = { [KeyType in keyof T]: T[KeyType] };

type CollectionPageDocumentDataSlicesSlice =
    | AlertSlice
    | IconGridSlice
    | VendorsSlice
    | CarouselSlice
    | CollapsibleTextSlice
    | ImageGridSlice
    | CollectionSlice
    | TextBlockSlice;

/**
 * Content for Collection Page documents
 */
interface CollectionPageDocumentData {
    /**
     * Slice Zone field in *Collection Page*
     *
     * - **Field Type**: Slice Zone
     * - **Placeholder**: *None*
     * - **API ID Path**: collection_page.slices[]
     * - **Tab**: Main
     * - **Documentation**: https://prismic.io/docs/field#slices
     */
    slices: prismic.SliceZone<CollectionPageDocumentDataSlicesSlice>
    /**
     * Meta Description field in *Collection Page*
     *
     * - **Field Type**: Rich Text
     * - **Placeholder**: A brief summary of the page
     * - **API ID Path**: collection_page.meta_description
     * - **Tab**: SEO & Metadata
     * - **Documentation**: https://prismic.io/docs/field#rich-text-title
     */;
    meta_description: prismic.RichTextField;

    /**
     * Meta Image field in *Collection Page*
     *
     * - **Field Type**: Image
     * - **Placeholder**: *None*
     * - **API ID Path**: collection_page.meta_image
     * - **Tab**: SEO & Metadata
     * - **Documentation**: https://prismic.io/docs/field#image
     */
    meta_image: prismic.ImageField<never>;

    /**
     * Meta Title field in *Collection Page*
     *
     * - **Field Type**: Text
     * - **Placeholder**: A title of the page used for social media and search engines
     * - **API ID Path**: collection_page.meta_title
     * - **Tab**: SEO & Metadata
     * - **Documentation**: https://prismic.io/docs/field#key-text
     */
    meta_title: prismic.KeyTextField;
}

/**
 * Collection Page document from Prismic
 *
 * - **API ID**: `collection_page`
 * - **Repeatable**: `true`
 * - **Documentation**: https://prismic.io/docs/custom-types
 *
 * @typeParam Lang - Language API ID of the document.
 */
export type CollectionPageDocument<Lang extends string = string> = prismic.PrismicDocumentWithUID<
    Simplify<CollectionPageDocumentData>,
    'collection_page',
    Lang
>;

type CustomPageDocumentDataSlicesSlice =
    | CarouselSlice
    | CollectionSlice
    | ImageGridSlice
    | TextBlockSlice
    | CollapsibleTextSlice
    | VendorsSlice
    | IconGridSlice
    | AlertSlice;

/**
 * Content for Custom Page documents
 */
interface CustomPageDocumentData {
    /**
     * Title field in *Custom Page*
     *
     * - **Field Type**: Text
     * - **Placeholder**: *None*
     * - **API ID Path**: custom_page.title
     * - **Tab**: Main
     * - **Documentation**: https://prismic.io/docs/field#key-text
     */
    title: prismic.KeyTextField;

    /**
     * Description field in *Custom Page*
     *
     * - **Field Type**: Text
     * - **Placeholder**: *None*
     * - **API ID Path**: custom_page.description
     * - **Tab**: Main
     * - **Documentation**: https://prismic.io/docs/field#key-text
     */
    description: prismic.KeyTextField;

    /**
     * Slice Zone field in *Custom Page*
     *
     * - **Field Type**: Slice Zone
     * - **Placeholder**: *None*
     * - **API ID Path**: custom_page.slices[]
     * - **Tab**: Main
     * - **Documentation**: https://prismic.io/docs/field#slices
     */
    slices: prismic.SliceZone<CustomPageDocumentDataSlicesSlice>
    /**
     * Meta Description field in *Custom Page*
     *
     * - **Field Type**: Rich Text
     * - **Placeholder**: A brief summary of the page
     * - **API ID Path**: custom_page.meta_description
     * - **Tab**: SEO & Metadata
     * - **Documentation**: https://prismic.io/docs/field#rich-text-title
     */;
    meta_description: prismic.RichTextField;

    /**
     * Meta Image field in *Custom Page*
     *
     * - **Field Type**: Image
     * - **Placeholder**: *None*
     * - **API ID Path**: custom_page.meta_image
     * - **Tab**: SEO & Metadata
     * - **Documentation**: https://prismic.io/docs/field#image
     */
    meta_image: prismic.ImageField<never>;

    /**
     * Meta Title field in *Custom Page*
     *
     * - **Field Type**: Text
     * - **Placeholder**: A title of the page used for social media and search engines
     * - **API ID Path**: custom_page.meta_title
     * - **Tab**: SEO & Metadata
     * - **Documentation**: https://prismic.io/docs/field#key-text
     */
    meta_title: prismic.KeyTextField;

    /**
     * Keywords field in *Custom Page*
     *
     * - **Field Type**: Text
     * - **Placeholder**: *None*
     * - **API ID Path**: custom_page.keywords
     * - **Tab**: SEO & Metadata
     * - **Documentation**: https://prismic.io/docs/field#key-text
     */
    keywords: prismic.KeyTextField;
}

/**
 * Custom Page document from Prismic
 *
 * - **API ID**: `custom_page`
 * - **Repeatable**: `true`
 * - **Documentation**: https://prismic.io/docs/custom-types
 *
 * @typeParam Lang - Language API ID of the document.
 */
export type CustomPageDocument<Lang extends string = string> = prismic.PrismicDocumentWithUID<
    Simplify<CustomPageDocumentData>,
    'custom_page',
    Lang
>;

/**
 * Primary content in *Footer → Slice Zone → Block → Primary*
 */
export interface FooterDocumentDataBodyBlockSlicePrimary {
    /**
     * Title field in *Footer → Slice Zone → Block → Primary*
     *
     * - **Field Type**: Text
     * - **Placeholder**: *None*
     * - **API ID Path**: footer.body[].block.primary.title
     * - **Documentation**: https://prismic.io/docs/field#key-text
     */
    title: prismic.KeyTextField;
}

/**
 * Item content in *Footer → Slice Zone → Block → Items*
 */
export interface FooterDocumentDataBodyBlockSliceItem {
    /**
     * Title field in *Footer → Slice Zone → Block → Items*
     *
     * - **Field Type**: Text
     * - **Placeholder**: *None*
     * - **API ID Path**: footer.body[].block.items.title
     * - **Documentation**: https://prismic.io/docs/field#key-text
     */
    title: prismic.KeyTextField;

    /**
     * Handle field in *Footer → Slice Zone → Block → Items*
     *
     * - **Field Type**: Text
     * - **Placeholder**: *None*
     * - **API ID Path**: footer.body[].block.items.handle
     * - **Documentation**: https://prismic.io/docs/field#key-text
     */
    handle: prismic.KeyTextField;
}

/**
 * Slice for *Footer → Slice Zone*
 */
export type FooterDocumentDataBodyBlockSlice = prismic.Slice<
    'block',
    Simplify<FooterDocumentDataBodyBlockSlicePrimary>,
    Simplify<FooterDocumentDataBodyBlockSliceItem>
>;

type FooterDocumentDataBodySlice = FooterDocumentDataBodyBlockSlice;

/**
 * Content for Footer documents
 */
interface FooterDocumentData {
    /**
     * Address field in *Footer*
     *
     * - **Field Type**: Rich Text
     * - **Placeholder**: *None*
     * - **API ID Path**: footer.address
     * - **Tab**: Main
     * - **Documentation**: https://prismic.io/docs/field#rich-text-title
     */
    address: prismic.RichTextField;

    /**
     * Show Language Selector field in *Footer*
     *
     * - **Field Type**: Boolean
     * - **Placeholder**: *None*
     * - **Default Value**: false
     * - **API ID Path**: footer.show_language_selector
     * - **Tab**: Main
     * - **Documentation**: https://prismic.io/docs/field#boolean
     */
    show_language_selector: prismic.BooleanField;

    /**
     * Show Currency Selector field in *Footer*
     *
     * - **Field Type**: Boolean
     * - **Placeholder**: *None*
     * - **Default Value**: false
     * - **API ID Path**: footer.show_currency_selector
     * - **Tab**: Main
     * - **Documentation**: https://prismic.io/docs/field#boolean
     */
    show_currency_selector: prismic.BooleanField;

    /**
     * Slice Zone field in *Footer*
     *
     * - **Field Type**: Slice Zone
     * - **Placeholder**: *None*
     * - **API ID Path**: footer.body[]
     * - **Tab**: Main
     * - **Documentation**: https://prismic.io/docs/field#slices
     */
    body: prismic.SliceZone<FooterDocumentDataBodySlice>;
}

/**
 * Footer document from Prismic
 *
 * - **API ID**: `footer`
 * - **Repeatable**: `false`
 * - **Documentation**: https://prismic.io/docs/custom-types
 *
 * @typeParam Lang - Language API ID of the document.
 */
export type FooterDocument<Lang extends string = string> = prismic.PrismicDocumentWithoutUID<
    Simplify<FooterDocumentData>,
    'footer',
    Lang
>;

/**
 * Item in *Header → Announcements*
 */
export interface HeadDocumentDataAnnouncementsItem {
    /**
     * Location field in *Header → Announcements*
     *
     * - **Field Type**: Select
     * - **Placeholder**: *None*
     * - **Default Value**: above
     * - **API ID Path**: head.announcements[].location
     * - **Documentation**: https://prismic.io/docs/field#select
     */
    location: prismic.SelectField<'above' | 'bellow', 'filled'>;

    /**
     * Background Color field in *Header → Announcements*
     *
     * - **Field Type**: Select
     * - **Placeholder**: *None*
     * - **Default Value**: secondary
     * - **API ID Path**: head.announcements[].background_color
     * - **Documentation**: https://prismic.io/docs/field#select
     */
    background_color: prismic.SelectField<'secondary' | 'primary', 'filled'>;

    /**
     * Content field in *Header → Announcements*
     *
     * - **Field Type**: Rich Text
     * - **Placeholder**: Free shipping on orders above $75
     * - **API ID Path**: head.announcements[].content
     * - **Documentation**: https://prismic.io/docs/field#rich-text-title
     */
    content: prismic.RichTextField;
}

/**
 * Content for Header documents
 */
interface HeadDocumentData {
    /**
     * Announcements field in *Header*
     *
     * - **Field Type**: Group
     * - **Placeholder**: *None*
     * - **API ID Path**: head.announcements[]
     * - **Tab**: Main
     * - **Documentation**: https://prismic.io/docs/field#group
     */
    announcements: prismic.GroupField<Simplify<HeadDocumentDataAnnouncementsItem>>;
}

/**
 * Header document from Prismic
 *
 * - **API ID**: `head`
 * - **Repeatable**: `false`
 * - **Documentation**: https://prismic.io/docs/custom-types
 *
 * @typeParam Lang - Language API ID of the document.
 */
export type HeadDocument<Lang extends string = string> = prismic.PrismicDocumentWithoutUID<
    Simplify<HeadDocumentData>,
    'head',
    Lang
>;

/**
 * Primary content in *Navigation → Slice Zone → Link → Primary*
 */
export interface NavigationDocumentDataBodyLinkSlicePrimary {
    /**
     * Title field in *Navigation → Slice Zone → Link → Primary*
     *
     * - **Field Type**: Text
     * - **Placeholder**: *None*
     * - **API ID Path**: navigation.body[].link.primary.title
     * - **Documentation**: https://prismic.io/docs/field#key-text
     */
    title: prismic.KeyTextField;

    /**
     * Handle field in *Navigation → Slice Zone → Link → Primary*
     *
     * - **Field Type**: Text
     * - **Placeholder**: *None*
     * - **API ID Path**: navigation.body[].link.primary.handle
     * - **Documentation**: https://prismic.io/docs/field#key-text
     */
    handle: prismic.KeyTextField;
}

/**
 * Item content in *Navigation → Slice Zone → Link → Items*
 */
export interface NavigationDocumentDataBodyLinkSliceItem {
    /**
     * Title field in *Navigation → Slice Zone → Link → Items*
     *
     * - **Field Type**: Text
     * - **Placeholder**: *None*
     * - **API ID Path**: navigation.body[].link.items.title
     * - **Documentation**: https://prismic.io/docs/field#key-text
     */
    title: prismic.KeyTextField;

    /**
     * Description field in *Navigation → Slice Zone → Link → Items*
     *
     * - **Field Type**: Text
     * - **Placeholder**: *None*
     * - **API ID Path**: navigation.body[].link.items.description
     * - **Documentation**: https://prismic.io/docs/field#key-text
     */
    description: prismic.KeyTextField;

    /**
     * Handle field in *Navigation → Slice Zone → Link → Items*
     *
     * - **Field Type**: Text
     * - **Placeholder**: *None*
     * - **API ID Path**: navigation.body[].link.items.handle
     * - **Documentation**: https://prismic.io/docs/field#key-text
     */
    handle: prismic.KeyTextField;
}

/**
 * Slice for *Navigation → Slice Zone*
 */
export type NavigationDocumentDataBodyLinkSlice = prismic.Slice<
    'link',
    Simplify<NavigationDocumentDataBodyLinkSlicePrimary>,
    Simplify<NavigationDocumentDataBodyLinkSliceItem>
>;

type NavigationDocumentDataBodySlice = NavigationDocumentDataBodyLinkSlice;

/**
 * Content for Navigation documents
 */
interface NavigationDocumentData {
    /**
     * Slice Zone field in *Navigation*
     *
     * - **Field Type**: Slice Zone
     * - **Placeholder**: *None*
     * - **API ID Path**: navigation.body[]
     * - **Tab**: Main
     * - **Documentation**: https://prismic.io/docs/field#slices
     */
    body: prismic.SliceZone<NavigationDocumentDataBodySlice>;
}

/**
 * Navigation document from Prismic
 *
 * - **API ID**: `navigation`
 * - **Repeatable**: `false`
 * - **Documentation**: https://prismic.io/docs/custom-types
 *
 * @typeParam Lang - Language API ID of the document.
 */
export type NavigationDocument<Lang extends string = string> = prismic.PrismicDocumentWithoutUID<
    Simplify<NavigationDocumentData>,
    'navigation',
    Lang
>;

type ProductPageDocumentDataSlicesSlice =
    | IconGridSlice
    | VendorsSlice
    | CollectionSlice
    | ImageGridSlice
    | CarouselSlice
    | TextBlockSlice
    | CollapsibleTextSlice
    | AlertSlice;

type ProductPageDocumentDataSlices2Slice =
    | CollectionSlice
    | CarouselSlice
    | TextBlockSlice
    | ImageGridSlice
    | IconGridSlice
    | VendorsSlice
    | CollapsibleTextSlice;

/**
 * Content for Product Page documents
 */
interface ProductPageDocumentData {
    /**
     * Slice Zone field in *Product Page*
     *
     * - **Field Type**: Slice Zone
     * - **Placeholder**: *None*
     * - **API ID Path**: product_page.slices[]
     * - **Tab**: Main
     * - **Documentation**: https://prismic.io/docs/field#slices
     */
    slices: prismic.SliceZone<ProductPageDocumentDataSlicesSlice>
    /**
     * Meta Description field in *Product Page*
     *
     * - **Field Type**: Rich Text
     * - **Placeholder**: A brief summary of the page
     * - **API ID Path**: product_page.meta_description
     * - **Tab**: SEO & Metadata
     * - **Documentation**: https://prismic.io/docs/field#rich-text-title
     */;
    meta_description: prismic.RichTextField;

    /**
     * Meta Image field in *Product Page*
     *
     * - **Field Type**: Image
     * - **Placeholder**: *None*
     * - **API ID Path**: product_page.meta_image
     * - **Tab**: SEO & Metadata
     * - **Documentation**: https://prismic.io/docs/field#image
     */
    meta_image: prismic.ImageField<never>;

    /**
     * Meta Title field in *Product Page*
     *
     * - **Field Type**: Text
     * - **Placeholder**: A title of the page used for social media and search engines
     * - **API ID Path**: product_page.meta_title
     * - **Tab**: SEO & Metadata
     * - **Documentation**: https://prismic.io/docs/field#key-text
     */
    meta_title: prismic.KeyTextField
    /**
     * Slice Zone field in *Product Page*
     *
     * - **Field Type**: Slice Zone
     * - **Placeholder**: *None*
     * - **API ID Path**: product_page.slices2[]
     * - **Tab**: Secondary
     * - **Documentation**: https://prismic.io/docs/field#slices
     */;
    slices2: prismic.SliceZone<ProductPageDocumentDataSlices2Slice>;
}

/**
 * Product Page document from Prismic
 *
 * - **API ID**: `product_page`
 * - **Repeatable**: `true`
 * - **Documentation**: https://prismic.io/docs/custom-types
 *
 * @typeParam Lang - Language API ID of the document.
 */
export type ProductPageDocument<Lang extends string = string> = prismic.PrismicDocumentWithUID<
    Simplify<ProductPageDocumentData>,
    'product_page',
    Lang
>;

/**
 * Item in *Store → Currencies*
 */
export interface StoreDocumentDataCurrenciesItem {
    /**
     * currency field in *Store → Currencies*
     *
     * - **Field Type**: Text
     * - **Placeholder**: *None*
     * - **API ID Path**: store.currencies[].currency
     * - **Documentation**: https://prismic.io/docs/field#key-text
     */
    currency: prismic.KeyTextField;
}

/**
 * Item in *Store → Social*
 */
export interface StoreDocumentDataSocialItem {
    /**
     * Name field in *Store → Social*
     *
     * - **Field Type**: Text
     * - **Placeholder**: *None*
     * - **API ID Path**: store.social[].name
     * - **Documentation**: https://prismic.io/docs/field#key-text
     */
    name: prismic.KeyTextField;

    /**
     * Link field in *Store → Social*
     *
     * - **Field Type**: Text
     * - **Placeholder**: *None*
     * - **API ID Path**: store.social[].url
     * - **Documentation**: https://prismic.io/docs/field#key-text
     */
    url: prismic.KeyTextField;

    /**
     * Handle field in *Store → Social*
     *
     * - **Field Type**: Text
     * - **Placeholder**: *None*
     * - **API ID Path**: store.social[].handle
     * - **Documentation**: https://prismic.io/docs/field#key-text
     */
    handle: prismic.KeyTextField;
}

/**
 * Content for Store documents
 */
interface StoreDocumentData {
    /**
     * Store name field in *Store*
     *
     * - **Field Type**: Text
     * - **Placeholder**: *None*
     * - **API ID Path**: store.store_name
     * - **Tab**: Main
     * - **Documentation**: https://prismic.io/docs/field#key-text
     */
    store_name: prismic.KeyTextField;

    /**
     * Logo field in *Store*
     *
     * - **Field Type**: Text
     * - **Placeholder**: *None*
     * - **API ID Path**: store.logo
     * - **Tab**: Main
     * - **Documentation**: https://prismic.io/docs/field#key-text
     */
    logo: prismic.KeyTextField;

    /**
     * Favicon field in *Store*
     *
     * - **Field Type**: Text
     * - **Placeholder**: *None*
     * - **API ID Path**: store.favicon
     * - **Tab**: Main
     * - **Documentation**: https://prismic.io/docs/field#key-text
     */
    favicon: prismic.KeyTextField;

    /**
     * Primary field in *Store*
     *
     * - **Field Type**: Color
     * - **Placeholder**: *None*
     * - **API ID Path**: store.primary
     * - **Tab**: Main
     * - **Documentation**: https://prismic.io/docs/field#color
     */
    primary: prismic.ColorField;

    /**
     * Secondary field in *Store*
     *
     * - **Field Type**: Color
     * - **Placeholder**: *None*
     * - **API ID Path**: store.secondary
     * - **Tab**: Main
     * - **Documentation**: https://prismic.io/docs/field#color
     */
    secondary: prismic.ColorField;

    /**
     * Primary Text Color field in *Store*
     *
     * - **Field Type**: Color
     * - **Placeholder**: *None*
     * - **API ID Path**: store.primary_text_color
     * - **Tab**: Main
     * - **Documentation**: https://prismic.io/docs/field#color
     */
    primary_text_color: prismic.ColorField;

    /**
     * Corner radius field in *Store*
     *
     * - **Field Type**: Text
     * - **Placeholder**: *None*
     * - **API ID Path**: store.border_radius
     * - **Tab**: Main
     * - **Documentation**: https://prismic.io/docs/field#key-text
     */
    border_radius: prismic.KeyTextField;

    /**
     * Currencies field in *Store*
     *
     * - **Field Type**: Group
     * - **Placeholder**: *None*
     * - **API ID Path**: store.currencies[]
     * - **Tab**: Main
     * - **Documentation**: https://prismic.io/docs/field#group
     */
    currencies: prismic.GroupField<Simplify<StoreDocumentDataCurrenciesItem>>;

    /**
     * Social field in *Store*
     *
     * - **Field Type**: Group
     * - **Placeholder**: *None*
     * - **API ID Path**: store.social[]
     * - **Tab**: Main
     * - **Documentation**: https://prismic.io/docs/field#group
     */
    social: prismic.GroupField<Simplify<StoreDocumentDataSocialItem>>;
}

/**
 * Store document from Prismic
 *
 * - **API ID**: `store`
 * - **Repeatable**: `false`
 * - **Documentation**: https://prismic.io/docs/custom-types
 *
 * @typeParam Lang - Language API ID of the document.
 */
export type StoreDocument<Lang extends string = string> = prismic.PrismicDocumentWithoutUID<
    Simplify<StoreDocumentData>,
    'store',
    Lang
>;

export type AllDocumentTypes =
    | CollectionPageDocument
    | CustomPageDocument
    | FooterDocument
    | HeadDocument
    | NavigationDocument
    | ProductPageDocument
    | StoreDocument;

/**
 * Primary content in *Alert → Primary*
 */
export interface AlertSliceDefaultPrimary {
    /**
     * Severity field in *Alert → Primary*
     *
     * - **Field Type**: Select
     * - **Placeholder**: *None*
     * - **Default Value**: info
     * - **API ID Path**: alert.primary.severity
     * - **Documentation**: https://prismic.io/docs/field#select
     */
    severity: prismic.SelectField<'info' | 'success' | 'warning' | 'error', 'filled'>;

    /**
     * Content field in *Alert → Primary*
     *
     * - **Field Type**: Rich Text
     * - **Placeholder**: *None*
     * - **API ID Path**: alert.primary.content
     * - **Documentation**: https://prismic.io/docs/field#rich-text-title
     */
    content: prismic.RichTextField;
}

/**
 * Default variation for Alert Slice
 *
 * - **API ID**: `default`
 * - **Description**: Default
 * - **Documentation**: https://prismic.io/docs/slice
 */
export type AlertSliceDefault = prismic.SharedSliceVariation<
    'default',
    Simplify<AlertSliceDefaultPrimary>,
    never
>;

/**
 * Slice variation for *Alert*
 */
type AlertSliceVariation = AlertSliceDefault;

/**
 * Alert Shared Slice
 *
 * - **API ID**: `alert`
 * - **Description**: Alert
 * - **Documentation**: https://prismic.io/docs/slice
 */
export type AlertSlice = prismic.SharedSlice<'alert', AlertSliceVariation>;

/**
 * Primary content in *Carousel → Primary*
 */
export interface CarouselSliceDefaultPrimary {
    /**
     * Delay field in *Carousel → Primary*
     *
     * - **Field Type**: Text
     * - **Placeholder**: 3000
     * - **API ID Path**: carousel.primary.delay
     * - **Documentation**: https://prismic.io/docs/field#key-text
     */
    delay: prismic.KeyTextField;
}

/**
 * Primary content in *Carousel → Items*
 */
export interface CarouselSliceDefaultItem {
    /**
     * Image field in *Carousel → Items*
     *
     * - **Field Type**: Image
     * - **Placeholder**: *None*
     * - **API ID Path**: carousel.items[].image
     * - **Documentation**: https://prismic.io/docs/field#image
     */
    image: prismic.ImageField<never>;

    /**
     * Mobile Image field in *Carousel → Items*
     *
     * - **Field Type**: Image
     * - **Placeholder**: *None*
     * - **API ID Path**: carousel.items[].mobile_image
     * - **Documentation**: https://prismic.io/docs/field#image
     */
    mobile_image: prismic.ImageField<never>;

    /**
     * href field in *Carousel → Items*
     *
     * - **Field Type**: Text
     * - **Placeholder**: *None*
     * - **API ID Path**: carousel.items[].href
     * - **Documentation**: https://prismic.io/docs/field#key-text
     */
    href: prismic.KeyTextField;
}

/**
 * Default variation for Carousel Slice
 *
 * - **API ID**: `default`
 * - **Description**: Default
 * - **Documentation**: https://prismic.io/docs/slice
 */
export type CarouselSliceDefault = prismic.SharedSliceVariation<
    'default',
    Simplify<CarouselSliceDefaultPrimary>,
    Simplify<CarouselSliceDefaultItem>
>;

/**
 * Slice variation for *Carousel*
 */
type CarouselSliceVariation = CarouselSliceDefault;

/**
 * Carousel Shared Slice
 *
 * - **API ID**: `carousel`
 * - **Description**: Carousel
 * - **Documentation**: https://prismic.io/docs/slice
 */
export type CarouselSlice = prismic.SharedSlice<'carousel', CarouselSliceVariation>;

/**
 * Primary content in *CollapsibleText → Primary*
 */
export interface CollapsibleTextSliceDefaultPrimary {
    /**
     * Title field in *CollapsibleText → Primary*
     *
     * - **Field Type**: Text
     * - **Placeholder**: *None*
     * - **API ID Path**: collapsible_text.primary.title
     * - **Documentation**: https://prismic.io/docs/field#key-text
     */
    title: prismic.KeyTextField;

    /**
     * Text field in *CollapsibleText → Primary*
     *
     * - **Field Type**: Rich Text
     * - **Placeholder**: *None*
     * - **API ID Path**: collapsible_text.primary.text
     * - **Documentation**: https://prismic.io/docs/field#rich-text-title
     */
    text: prismic.RichTextField;

    /**
     * Accent field in *CollapsibleText → Primary*
     *
     * - **Field Type**: Color
     * - **Placeholder**: *None*
     * - **API ID Path**: collapsible_text.primary.accent
     * - **Documentation**: https://prismic.io/docs/field#color
     */
    accent: prismic.ColorField;

    /**
     * Accent Dark field in *CollapsibleText → Primary*
     *
     * - **Field Type**: Color
     * - **Placeholder**: *None*
     * - **API ID Path**: collapsible_text.primary.accent_dark
     * - **Documentation**: https://prismic.io/docs/field#color
     */
    accent_dark: prismic.ColorField;
}

/**
 * Default variation for CollapsibleText Slice
 *
 * - **API ID**: `default`
 * - **Description**: Default
 * - **Documentation**: https://prismic.io/docs/slice
 */
export type CollapsibleTextSliceDefault = prismic.SharedSliceVariation<
    'default',
    Simplify<CollapsibleTextSliceDefaultPrimary>,
    never
>;

/**
 * Slice variation for *CollapsibleText*
 */
type CollapsibleTextSliceVariation = CollapsibleTextSliceDefault;

/**
 * CollapsibleText Shared Slice
 *
 * - **API ID**: `collapsible_text`
 * - **Description**: CollapsibleText
 * - **Documentation**: https://prismic.io/docs/slice
 */
export type CollapsibleTextSlice = prismic.SharedSlice<
    'collapsible_text',
    CollapsibleTextSliceVariation
>;

/**
 * Primary content in *Collection → Primary*
 */
export interface CollectionSliceDefaultPrimary {
    /**
     * Handle field in *Collection → Primary*
     *
     * - **Field Type**: Text
     * - **Placeholder**: *None*
     * - **API ID Path**: collection.primary.handle
     * - **Documentation**: https://prismic.io/docs/field#key-text
     */
    handle: prismic.KeyTextField;

    /**
     * Title field in *Collection → Primary*
     *
     * - **Field Type**: Rich Text
     * - **Placeholder**: *None*
     * - **API ID Path**: collection.primary.title
     * - **Documentation**: https://prismic.io/docs/field#rich-text-title
     */
    title: prismic.RichTextField;

    /**
     * Body field in *Collection → Primary*
     *
     * - **Field Type**: Rich Text
     * - **Placeholder**: *None*
     * - **API ID Path**: collection.primary.body
     * - **Documentation**: https://prismic.io/docs/field#rich-text-title
     */
    body: prismic.RichTextField;

    /**
     * Alignment field in *Collection → Primary*
     *
     * - **Field Type**: Select
     * - **Placeholder**: *None*
     * - **Default Value**: left
     * - **API ID Path**: collection.primary.alignment
     * - **Documentation**: https://prismic.io/docs/field#select
     */
    alignment: prismic.SelectField<'left' | 'center' | 'right', 'filled'>;

    /**
     * Item Limit field in *Collection → Primary*
     *
     * - **Field Type**: Number
     * - **Placeholder**: 16
     * - **API ID Path**: collection.primary.limit
     * - **Documentation**: https://prismic.io/docs/field#number
     */
    limit: prismic.NumberField;

    /**
     * Direction field in *Collection → Primary*
     *
     * - **Field Type**: Select
     * - **Placeholder**: *None*
     * - **Default Value**: horizontal
     * - **API ID Path**: collection.primary.direction
     * - **Documentation**: https://prismic.io/docs/field#select
     */
    direction: prismic.SelectField<'horizontal' | 'vertical' | 'grid', 'filled'>;

    /**
     * Hide Title field in *Collection → Primary*
     *
     * - **Field Type**: Boolean
     * - **Placeholder**: *None*
     * - **Default Value**: false
     * - **API ID Path**: collection.primary.hide_title
     * - **Documentation**: https://prismic.io/docs/field#boolean
     */
    hide_title: prismic.BooleanField;

    /**
     * Accent field in *Collection → Primary*
     *
     * - **Field Type**: Color
     * - **Placeholder**: *None*
     * - **API ID Path**: collection.primary.accent
     * - **Documentation**: https://prismic.io/docs/field#color
     */
    accent: prismic.ColorField;

    /**
     * Accent Dark field in *Collection → Primary*
     *
     * - **Field Type**: Color
     * - **Placeholder**: *None*
     * - **API ID Path**: collection.primary.accent_dark
     * - **Documentation**: https://prismic.io/docs/field#color
     */
    accent_dark: prismic.ColorField;
}

/**
 * Default variation for Collection Slice
 *
 * - **API ID**: `default`
 * - **Description**: Default
 * - **Documentation**: https://prismic.io/docs/slice
 */
export type CollectionSliceDefault = prismic.SharedSliceVariation<
    'default',
    Simplify<CollectionSliceDefaultPrimary>,
    never
>;

/**
 * Slice variation for *Collection*
 */
type CollectionSliceVariation = CollectionSliceDefault;

/**
 * Collection Shared Slice
 *
 * - **API ID**: `collection`
 * - **Description**: Collection
 * - **Documentation**: https://prismic.io/docs/slice
 */
export type CollectionSlice = prismic.SharedSlice<'collection', CollectionSliceVariation>;

/**
 * Primary content in *IconGrid → Items*
 */
export interface IconGridSliceDefaultItem {
    /**
     * Icon field in *IconGrid → Items*
     *
     * - **Field Type**: Image
     * - **Placeholder**: *None*
     * - **API ID Path**: icon_grid.items[].icon
     * - **Documentation**: https://prismic.io/docs/field#image
     */
    icon: prismic.ImageField<never>;

    /**
     * Title field in *IconGrid → Items*
     *
     * - **Field Type**: Text
     * - **Placeholder**: *None*
     * - **API ID Path**: icon_grid.items[].title
     * - **Documentation**: https://prismic.io/docs/field#key-text
     */
    title: prismic.KeyTextField;
}

/**
 * Default variation for IconGrid Slice
 *
 * - **API ID**: `default`
 * - **Description**: Default
 * - **Documentation**: https://prismic.io/docs/slice
 */
export type IconGridSliceDefault = prismic.SharedSliceVariation<
    'default',
    Record<string, never>,
    Simplify<IconGridSliceDefaultItem>
>;

/**
 * Slice variation for *IconGrid*
 */
type IconGridSliceVariation = IconGridSliceDefault;

/**
 * IconGrid Shared Slice
 *
 * - **API ID**: `icon_grid`
 * - **Description**: IconGrid
 * - **Documentation**: https://prismic.io/docs/slice
 */
export type IconGridSlice = prismic.SharedSlice<'icon_grid', IconGridSliceVariation>;

/**
 * Primary content in *ImageGrid → Items*
 */
export interface ImageGridSliceDefaultItem {
    /**
     * Image field in *ImageGrid → Items*
     *
     * - **Field Type**: Image
     * - **Placeholder**: *None*
     * - **API ID Path**: image_grid.items[].image
     * - **Documentation**: https://prismic.io/docs/field#image
     */
    image: prismic.ImageField<never>;

    /**
     * Title field in *ImageGrid → Items*
     *
     * - **Field Type**: Text
     * - **Placeholder**: *None*
     * - **API ID Path**: image_grid.items[].title
     * - **Documentation**: https://prismic.io/docs/field#key-text
     */
    title: prismic.KeyTextField;

    /**
     * href field in *ImageGrid → Items*
     *
     * - **Field Type**: Text
     * - **Placeholder**: *None*
     * - **API ID Path**: image_grid.items[].href
     * - **Documentation**: https://prismic.io/docs/field#key-text
     */
    href: prismic.KeyTextField;
}

/**
 * Default variation for ImageGrid Slice
 *
 * - **API ID**: `default`
 * - **Description**: Default
 * - **Documentation**: https://prismic.io/docs/slice
 */
export type ImageGridSliceDefault = prismic.SharedSliceVariation<
    'default',
    Record<string, never>,
    Simplify<ImageGridSliceDefaultItem>
>;

/**
 * Slice variation for *ImageGrid*
 */
type ImageGridSliceVariation = ImageGridSliceDefault;

/**
 * ImageGrid Shared Slice
 *
 * - **API ID**: `image_grid`
 * - **Description**: ImageGrid
 * - **Documentation**: https://prismic.io/docs/slice
 */
export type ImageGridSlice = prismic.SharedSlice<'image_grid', ImageGridSliceVariation>;

/**
 * Primary content in *Overview → Items*
 */
export interface TextBlockSliceDefaultItem {
    /**
     * Layout field in *Overview → Items*
     *
     * - **Field Type**: Select
     * - **Placeholder**: Image on the left or the right?
     * - **Default Value**: left
     * - **API ID Path**: text_block.items[].layout
     * - **Documentation**: https://prismic.io/docs/field#select
     */
    layout: prismic.SelectField<'left' | 'right', 'filled'>;

    /**
     * Accent field in *Overview → Items*
     *
     * - **Field Type**: Color
     * - **Placeholder**: *None*
     * - **API ID Path**: text_block.items[].accent
     * - **Documentation**: https://prismic.io/docs/field#color
     */
    accent: prismic.ColorField;

    /**
     * Image field in *Overview → Items*
     *
     * - **Field Type**: Image
     * - **Placeholder**: *None*
     * - **API ID Path**: text_block.items[].image
     * - **Documentation**: https://prismic.io/docs/field#image
     */
    image: prismic.ImageField<never>;

    /**
     * Image Style field in *Overview → Items*
     *
     * - **Field Type**: Select
     * - **Placeholder**: *None*
     * - **Default Value**: normal
     * - **API ID Path**: text_block.items[].image_style
     * - **Documentation**: https://prismic.io/docs/field#select
     */
    image_style: prismic.SelectField<'normal' | 'cover', 'filled'>;

    /**
     * Text field in *Overview → Items*
     *
     * - **Field Type**: Rich Text
     * - **Placeholder**: *None*
     * - **API ID Path**: text_block.items[].text
     * - **Documentation**: https://prismic.io/docs/field#rich-text-title
     */
    text: prismic.RichTextField;
}

/**
 * Default variation for Overview Slice
 *
 * - **API ID**: `default`
 * - **Description**: Image on the left side
 * - **Documentation**: https://prismic.io/docs/slice
 */
export type TextBlockSliceDefault = prismic.SharedSliceVariation<
    'default',
    Record<string, never>,
    Simplify<TextBlockSliceDefaultItem>
>;

/**
 * Slice variation for *Overview*
 */
type TextBlockSliceVariation = TextBlockSliceDefault;

/**
 * Overview Shared Slice
 *
 * - **API ID**: `text_block`
 * - **Description**: An image with a textblock to the side of it
 * - **Documentation**: https://prismic.io/docs/slice
 */
export type TextBlockSlice = prismic.SharedSlice<'text_block', TextBlockSliceVariation>;

/**
 * Default variation for Vendors Slice
 *
 * - **API ID**: `default`
 * - **Description**: Default
 * - **Documentation**: https://prismic.io/docs/slice
 */
export type VendorsSliceDefault = prismic.SharedSliceVariation<
    'default',
    Record<string, never>,
    never
>;

/**
 * Slice variation for *Vendors*
 */
type VendorsSliceVariation = VendorsSliceDefault;

/**
 * Vendors Shared Slice
 *
 * - **API ID**: `vendors`
 * - **Description**: Vendors
 * - **Documentation**: https://prismic.io/docs/slice
 */
export type VendorsSlice = prismic.SharedSlice<'vendors', VendorsSliceVariation>;

declare module '@prismicio/client' {
    interface CreateClient {
        (
            repositoryNameOrEndpoint: string,
            options?: prismic.ClientConfig
        ): prismic.Client<AllDocumentTypes>;
    }

    namespace Content {
        export type {
            CollectionPageDocument,
            CollectionPageDocumentData,
            CustomPageDocument,
            CustomPageDocumentData,
            FooterDocument,
            FooterDocumentData,
            HeadDocument,
            HeadDocumentData,
            NavigationDocument,
            NavigationDocumentData,
            ProductPageDocument,
            ProductPageDocumentData,
            StoreDocument,
            StoreDocumentData,
            AllDocumentTypes,
            AlertSlice,
            AlertSliceVariation,
            AlertSliceDefault,
            CarouselSlice,
            CarouselSliceVariation,
            CarouselSliceDefault,
            CollapsibleTextSlice,
            CollapsibleTextSliceVariation,
            CollapsibleTextSliceDefault,
            CollectionSlice,
            CollectionSliceVariation,
            CollectionSliceDefault,
            IconGridSlice,
            IconGridSliceVariation,
            IconGridSliceDefault,
            ImageGridSlice,
            ImageGridSliceVariation,
            ImageGridSliceDefault,
            TextBlockSlice,
            TextBlockSliceVariation,
            TextBlockSliceDefault,
            VendorsSlice,
            VendorsSliceVariation,
            VendorsSliceDefault
        };
    }
}
