/**
 * The frozen field-shape source for the CMS codegen emitters.
 *
 * TEARDOWN-02 deleted the Payload `CollectionConfig`/`Block` modules
 * (`src/collections/**`, the `src/blocks/*` block configs) whose field arrays
 * the emitters walked. The two generated artifacts derived from them are LIVE
 * and frozen, though: the storefront read-contract types
 * (`src/types/content-types.ts`, the SFREAD-01 surface) and the Convex CMS
 * content-table validators (`packages/convex/convex/tables/cms.ts`). This
 * module preserves the exact emitter input — the same descriptor-builder
 * expressions and raw field literals the collection/block configs carried,
 * minus the Payload runtime concerns (access predicates, hooks, validators,
 * admin metadata) the emitters never read — so both artifacts keep emitting
 * byte-identically.
 *
 * Editing rule: the editor renders from `src/editor/collection-fields.ts`
 * (descriptors), Convex validates against `tables/cms.ts`, and the storefront
 * types come from here. A content-model change must touch this module and the
 * editor schema together, then run `pnpm cms:gen` — `cms:gen:check` gates the
 * drift in CI.
 */
import { FONT_FAMILIES } from '@nordcom/commerce-db/lib/theme';
import {
    arrayField,
    checkboxField,
    condition,
    emailField,
    groupField,
    jsonField,
    localized,
    numberField,
    required,
    responsiveField,
    selectField,
    textareaField,
    textField,
} from '../../src/descriptors';
import { imageField, linkField, seoGroup, topLevelNavItemField } from '../../src/fields';

/**
 * Structural view of one emit-walkable field: the members the emitters read
 * (`type`/`name`/`required`/`hasMany`/`relationTo`/`options`/`fields`/`blocks`)
 * plus an open index so descriptor extras (`defaultValue`, `minRows`, storage
 * hints like `index`/`unique`) ride along without widening the emitters'
 * contract.
 */
export type ContentFieldShape = {
    type: string;
    name?: string;
    label?: string;
    required?: boolean;
    hasMany?: boolean;
    relationTo?: string;
    options?: Array<{ label?: string; value: string } | string>;
    fields?: ContentFieldShape[];
    blocks?: ContentBlockShape[];
    [key: string]: unknown;
};

/** One block definition as the emitters walk it. */
export type ContentBlockShape = {
    slug: string;
    /** The TypeScript interface name the content-types emitter gives the block. */
    interfaceName?: string;
    fields: ContentFieldShape[];
};

/** One collection's emit surface: its slug and ordered field shapes. */
export type ContentCollectionShape = {
    slug: string;
    fields: ContentFieldShape[];
};

/**
 * Mixes descriptor-builder outputs and raw field literals into one
 * {@link ContentFieldShape} array — the same identity pass the deleted
 * `toFieldConfigs` bridge performed for the Payload configs. Descriptors are
 * structurally emit-walkable already; the cast only widens their union type.
 *
 * @param fields - Descriptors and/or raw field shapes in source order.
 * @returns The same values typed as the emit surface.
 */
const shape = (...fields: Array<ContentFieldShape | Record<string, unknown>>): ContentFieldShape[] =>
    fields as ContentFieldShape[];

const alertBlockShape: ContentBlockShape = {
    slug: 'alert',
    interfaceName: 'AlertBlock',
    fields: shape(
        required(
            selectField({
                name: 'severity',
                defaultValue: 'info',
                options: [
                    { label: 'Info', value: 'info' },
                    { label: 'Success', value: 'success' },
                    { label: 'Warning', value: 'warning' },
                    { label: 'Error', value: 'error' },
                ],
            }),
        ),
        localized(required(textField({ name: 'title' }))),
        localized(textareaField({ name: 'body' })),
        checkboxField({ name: 'dismissible', defaultValue: false }),
    ),
};

const bannerBlockShape: ContentBlockShape = {
    slug: 'banner',
    interfaceName: 'BannerBlock',
    fields: shape(
        localized(required(textField({ name: 'heading' }))),
        localized(textField({ name: 'subheading' })),
        imageField({ name: 'background', localized: true }),
        linkField({ name: 'cta' }),
        selectField({
            name: 'alignment',
            defaultValue: 'center',
            options: [
                { label: 'Left', value: 'left' },
                { label: 'Center', value: 'center' },
                { label: 'Right', value: 'right' },
            ],
        }),
    ),
};

const collectionBlockShape: ContentBlockShape = {
    slug: 'collection',
    interfaceName: 'CollectionBlock',
    fields: shape(
        { name: 'handle', type: 'text', required: true },
        localized(textField({ name: 'title' })),
        responsiveField({
            name: 'layout',
            label: 'Layout',
            field: selectField({
                name: 'layout',
                options: [
                    { label: 'Grid', value: 'grid' },
                    { label: 'Carousel', value: 'carousel' },
                ],
            }),
            defaultValue: { base: 'carousel', md: 'grid' },
        }),
        { name: 'limit', type: 'number', defaultValue: 8, min: 1, max: 48 },
    ),
};

const htmlBlockShape: ContentBlockShape = {
    slug: 'html',
    interfaceName: 'HtmlBlock',
    fields: shape({ name: 'html', type: 'code', required: true }),
};

const mediaGridBlockShape: ContentBlockShape = {
    slug: 'media-grid',
    interfaceName: 'MediaGridBlock',
    fields: shape(
        required(
            selectField({
                name: 'itemType',
                defaultValue: 'image',
                options: [
                    { label: 'Image', value: 'image' },
                    { label: 'Icon', value: 'icon' },
                ],
            }),
        ),
        { name: 'columns', type: 'number', defaultValue: 3, min: 1, max: 6 },
        arrayField({
            name: 'items',
            minRows: 1,
            fields: [
                imageField({ name: 'image' }),
                localized(textField({ name: 'caption' })),
                linkField({ name: 'link' }),
            ],
        }),
    ),
};

const overviewBlockShape: ContentBlockShape = {
    slug: 'overview',
    interfaceName: 'OverviewBlock',
    fields: shape(
        required(
            selectField({
                name: 'source',
                defaultValue: 'collection',
                options: [
                    { label: 'Collection', value: 'collection' },
                    { label: 'Latest products', value: 'latest' },
                    { label: 'Featured', value: 'featured' },
                ],
            }),
        ),
        condition(textField({ name: 'collectionHandle' }), (_data, sibling) => sibling.source === 'collection'),
        localized(textField({ name: 'title' })),
        { name: 'limit', type: 'number', defaultValue: 12, min: 1, max: 48 },
    ),
};

const richTextBlockShape: ContentBlockShape = {
    slug: 'rich-text',
    interfaceName: 'RichTextBlock',
    fields: shape(
        localized(jsonField({ name: 'body' })),
        checkboxField({ name: 'collapsible', defaultValue: false }),
        condition(
            checkboxField({ name: 'collapsedByDefault', defaultValue: false }),
            (_data, sibling) => sibling.collapsible === true,
        ),
        condition(localized(textField({ name: 'collapseLabel' })), (_data, sibling) => sibling.collapsible === true),
    ),
};

const vendorsBlockShape: ContentBlockShape = {
    slug: 'vendors',
    interfaceName: 'VendorsBlock',
    fields: shape(localized(textField({ name: 'title' })), {
        name: 'maxVendors',
        type: 'number',
        defaultValue: 12,
        min: 1,
        max: 48,
    }),
};

/** The eight leaf blocks, in the deleted registry's admin display order. */
const leafBlockShapes: ContentBlockShape[] = [
    alertBlockShape,
    bannerBlockShape,
    collectionBlockShape,
    htmlBlockShape,
    mediaGridBlockShape,
    overviewBlockShape,
    richTextBlockShape,
    vendorsBlockShape,
];

/**
 * The `columns` layout block. Its nested `content` embeds every leaf block as
 * a sibling — and never another `columns`, mirroring the deleted
 * `buildColumnsBlock` sibling filter that prevented infinite nesting.
 */
const columnsBlockShape: ContentBlockShape = {
    slug: 'columns',
    interfaceName: 'ColumnsBlock',
    fields: [
        {
            name: 'columns',
            type: 'array',
            minRows: 1,
            maxRows: 4,
            fields: shape(
                selectField({
                    name: 'width',
                    defaultValue: 'auto',
                    options: [
                        { label: 'Auto', value: 'auto' },
                        { label: 'One-third', value: '1/3' },
                        { label: 'One-half', value: '1/2' },
                        { label: 'Two-thirds', value: '2/3' },
                        { label: 'Full', value: 'full' },
                    ],
                }),
                { name: 'content', type: 'blocks', blocks: leafBlockShapes },
            ),
        },
    ],
};

/**
 * Every block shape, columns first — the union order the `blocks` fields and
 * the emitted block-interface order both follow (matches the deleted
 * `allBlocks` registry order).
 */
export const allBlockShapes: ContentBlockShape[] = [columnsBlockShape, ...leafBlockShapes];

/**
 * Select options for the shop theme font fields, derived from the shared
 * `FONT_FAMILIES` allowlist so the emitted `Shop` theme typography union stays
 * in lockstep with the storefront `next/font` loader.
 */
const FONT_FAMILY_OPTIONS = Object.entries(FONT_FAMILIES).map(([value, label]) => ({ label, value }));

const usersShape: ContentCollectionShape = {
    slug: 'users',
    fields: shape({
        name: 'role',
        type: 'select',
        required: true,
        defaultValue: 'editor',
        options: [
            { label: 'Admin', value: 'admin' },
            { label: 'Editor', value: 'editor' },
        ],
    }),
};

const mediaShape: ContentCollectionShape = {
    slug: 'media',
    fields: shape(required(textField({ name: 'alt' })), localized(textField({ name: 'caption' }))),
};

const shopsShape: ContentCollectionShape = {
    slug: 'shops',
    fields: shape(
        required(textField({ name: 'name' })),
        textareaField({ name: 'description' }),
        { name: 'domain', type: 'text', required: true, unique: true, index: true },
        { name: 'alternativeDomains', type: 'text', hasMany: true, index: true },
        groupField({
            name: 'i18n',
            fields: [required(textField({ name: 'defaultLocale', defaultValue: 'en-US' }))],
        }),
        groupField({
            name: 'design',
            fields: [
                groupField({
                    name: 'header',
                    fields: [
                        groupField({
                            name: 'logo',
                            fields: [
                                required(textField({ name: 'src' })),
                                required(textField({ name: 'alt' })),
                                required(numberField({ name: 'width', defaultValue: 512 })),
                                required(numberField({ name: 'height', defaultValue: 512 })),
                            ],
                        }),
                    ],
                }),
                arrayField({
                    name: 'accents',
                    fields: [
                        required(
                            selectField({
                                name: 'type',
                                options: [
                                    { label: 'primary', value: 'primary' },
                                    { label: 'secondary', value: 'secondary' },
                                ],
                            }),
                        ),
                        required(textField({ name: 'color' })),
                        required(textField({ name: 'foreground' })),
                    ],
                }),
            ],
        }),
        {
            name: 'theme',
            type: 'group',
            fields: [
                {
                    name: 'colors',
                    type: 'group',
                    fields: [
                        { name: 'background', type: 'text' },
                        { name: 'foreground', type: 'text' },
                        {
                            name: 'accents',
                            type: 'array',
                            fields: [
                                { name: 'type', type: 'select', options: ['primary', 'secondary'], required: true },
                                { name: 'color', type: 'text', required: true },
                                { name: 'foreground', type: 'text', required: true },
                            ],
                        },
                        { name: 'accentPrimaryLight', type: 'text' },
                        { name: 'accentPrimaryDark', type: 'text' },
                        { name: 'accentSecondaryLight', type: 'text' },
                        { name: 'accentSecondaryDark', type: 'text' },
                        {
                            name: 'surface',
                            type: 'group',
                            fields: [
                                { name: 'base', type: 'text' },
                                { name: 'raised', type: 'text' },
                                { name: 'sunken', type: 'text' },
                            ],
                        },
                        {
                            name: 'text',
                            type: 'group',
                            fields: [
                                { name: 'default', type: 'text' },
                                { name: 'muted', type: 'text' },
                            ],
                        },
                        {
                            name: 'border',
                            type: 'group',
                            fields: [
                                { name: 'default', type: 'text' },
                                { name: 'strong', type: 'text' },
                            ],
                        },
                        {
                            name: 'state',
                            type: 'group',
                            fields: [
                                { name: 'sale', type: 'text' },
                                { name: 'danger', type: 'text' },
                                { name: 'success', type: 'text' },
                                { name: 'info', type: 'text' },
                            ],
                        },
                        { name: 'focusRing', type: 'text' },
                    ],
                },
                {
                    name: 'typography',
                    type: 'group',
                    fields: [
                        { name: 'fontFamily', type: 'select', options: FONT_FAMILY_OPTIONS },
                        { name: 'headingFamily', type: 'select', options: FONT_FAMILY_OPTIONS },
                        {
                            name: 'fontWeights',
                            type: 'group',
                            fields: [
                                { name: 'normal', type: 'number' },
                                { name: 'medium', type: 'number' },
                                { name: 'semibold', type: 'number' },
                                { name: 'bold', type: 'number' },
                            ],
                        },
                        {
                            name: 'scale',
                            type: 'group',
                            fields: [
                                { name: 'xs', type: 'text' },
                                { name: 'sm', type: 'text' },
                                { name: 'base', type: 'text' },
                                { name: 'lg', type: 'text' },
                                { name: 'xl', type: 'text' },
                            ],
                        },
                    ],
                },
                {
                    name: 'radii',
                    type: 'group',
                    fields: [
                        { name: 'block', type: 'text' },
                        { name: 'blockLarge', type: 'text' },
                        { name: 'blockSmall', type: 'text' },
                        { name: 'blockTiny', type: 'text' },
                    ],
                },
                {
                    name: 'spacing',
                    type: 'group',
                    fields: [
                        { name: 'blockPadding', type: 'text' },
                        { name: 'blockSpacer', type: 'text' },
                    ],
                },
                {
                    name: 'elevation',
                    type: 'group',
                    fields: [
                        { name: 'card', type: 'text' },
                        { name: 'cardHover', type: 'text' },
                        { name: 'panel', type: 'text' },
                    ],
                },
                {
                    type: 'collapsible',
                    label: 'Product card',
                    fields: [
                        {
                            name: 'productCard',
                            type: 'group',
                            fields: [
                                { name: 'bg', type: 'text' },
                                { name: 'borderColor', type: 'text' },
                                { name: 'borderWidth', type: 'text' },
                                { name: 'radius', type: 'text' },
                                { name: 'padding', type: 'text' },
                                { name: 'gap', type: 'text' },
                                { name: 'shadow', type: 'text' },
                                { name: 'shadowHover', type: 'text' },
                                { name: 'minWidth', type: 'text' },
                                { name: 'maxWidth', type: 'text' },
                                { name: 'gridAlign', type: 'text' },
                                { name: 'searchImageWidth', type: 'text' },
                                { name: 'imageRadius', type: 'text' },
                                { name: 'imagePadding', type: 'text' },
                                { name: 'imageFit', type: 'text' },
                                { name: 'imageHoverSwap', type: 'text' },
                                { name: 'imageSizes', type: 'text' },
                                { name: 'aspectVertical', type: 'text' },
                                { name: 'aspectHorizontal', type: 'text' },
                                { name: 'aspectHorizontalSquare', type: 'text' },
                                { name: 'aspectMicro', type: 'text' },
                                { name: 'vendorColor', type: 'text' },
                                { name: 'vendorSize', type: 'text' },
                                { name: 'titleColor', type: 'text' },
                                { name: 'titleSize', type: 'text' },
                                { name: 'titleWeight', type: 'number' },
                                { name: 'titleLineClamp', type: 'number' },
                                { name: 'priceColor', type: 'text' },
                                { name: 'priceSize', type: 'text' },
                                { name: 'priceWeight', type: 'number' },
                                { name: 'compareColor', type: 'text' },
                                { name: 'urgencyColor', type: 'text' },
                                { name: 'urgencyThreshold', type: 'number' },
                                { name: 'eyebrowTracking', type: 'text' },
                                { name: 'swatchSize', type: 'text' },
                                { name: 'swatchGap', type: 'text' },
                                { name: 'swatchRingColor', type: 'text' },
                                { name: 'swatchHitPadding', type: 'text' },
                                { name: 'chipBg', type: 'text' },
                                { name: 'chipColor', type: 'text' },
                                { name: 'chipBorder', type: 'text' },
                                { name: 'chipActiveBg', type: 'text' },
                                { name: 'chipActiveColor', type: 'text' },
                                { name: 'chipPaddingY', type: 'text' },
                                { name: 'chipPaddingX', type: 'text' },
                                { name: 'moreBg', type: 'text' },
                                { name: 'moreColor', type: 'text' },
                                { name: 'moreSize', type: 'text' },
                                { name: 'moreWeight', type: 'number' },
                                { name: 'moreMinSize', type: 'text' },
                                { name: 'ctaBg', type: 'text' },
                                { name: 'ctaColor', type: 'text' },
                                { name: 'ctaRadius', type: 'text' },
                                { name: 'ctaPaddingY', type: 'text' },
                                { name: 'ctaHeight', type: 'text' },
                                { name: 'ctaPlacement', type: 'text' },
                                { name: 'ctaPillPosition', type: 'text' },
                                { name: 'ctaPillLabel', type: 'text' },
                                { name: 'ctaPillIcon', type: 'text' },
                                { name: 'ctaPillReveal', type: 'text' },
                                { name: 'ctaInlineStyle', type: 'text' },
                                { name: 'fastPathDot', type: 'text' },
                                { name: 'fastPathSingleVariant', type: 'text' },
                                { name: 'quickAddPresentation', type: 'text' },
                                { name: 'overlayBg', type: 'text' },
                                { name: 'overlayRadius', type: 'text' },
                                { name: 'overlayBorderColor', type: 'text' },
                                { name: 'overlayShadow', type: 'text' },
                                { name: 'overlayWidth', type: 'text' },
                                { name: 'overlayMaxHeight', type: 'text' },
                                { name: 'overlayPadding', type: 'text' },
                                { name: 'oosOpacity', type: 'number' },
                                { name: 'oosImageSaturate', type: 'number' },
                                { name: 'motionEase', type: 'text' },
                                { name: 'motionFast', type: 'text' },
                                { name: 'motionBase', type: 'text' },
                                { name: 'motionPickerIn', type: 'text' },
                                { name: 'motionPickerOut', type: 'text' },
                                { name: 'motionHoverDuration', type: 'text' },
                                { name: 'motionHoverEase', type: 'text' },
                                { name: 'motionImageSwapDuration', type: 'text' },
                                { name: 'motionOverlayInDuration', type: 'text' },
                                { name: 'motionOverlayInEase', type: 'text' },
                                { name: 'saleStyle', type: 'text' },
                                { name: 'saleStrikeColor', type: 'text' },
                                { name: 'saleStrikeAngle', type: 'text' },
                                { name: 'saleStrikeExtend', type: 'text' },
                                { name: 'saleCurrentColor', type: 'text' },
                                { name: 'saleShowSavingsLine', type: 'text' },
                                { name: 'saleBadgeStyle', type: 'text' },
                                { name: 'saleBadgePosition', type: 'text' },
                                { name: 'saleBadgeText', type: 'text' },
                                { name: 'saleBadgeMinDiscount', type: 'number' },
                                { name: 'saleBadgeAllowOverlap', type: 'checkbox' },
                            ],
                        },
                    ],
                },
            ],
        },
        {
            name: 'commerce',
            type: 'group',
            fields: [
                { name: 'maxQuantity', type: 'number', defaultValue: 199999 },
                { name: 'processingTimeInDays', type: 'number', defaultValue: 5 },
            ],
        },
        {
            name: 'icons',
            type: 'group',
            fields: [
                {
                    name: 'favicon',
                    type: 'group',
                    fields: [
                        { name: 'width', type: 'number', defaultValue: 512 },
                        { name: 'height', type: 'number', defaultValue: 512 },
                        { name: 'src', type: 'text' },
                        { name: 'alt', type: 'text' },
                    ],
                },
            ],
        },
        {
            name: 'commerceProvider',
            type: 'group',
            fields: [
                {
                    name: 'type',
                    type: 'select',
                    options: ['shopify', 'stripe'],
                    required: true,
                    defaultValue: 'shopify',
                },
                { name: 'storefrontId', type: 'text' },
                { name: 'domain', type: 'text' },
                { name: 'id', type: 'text' },
                {
                    name: 'authentication',
                    type: 'group',
                    fields: [
                        { name: 'token', type: 'text' },
                        { name: 'publicToken', type: 'text' },
                        { name: 'domain', type: 'text' },
                        {
                            name: 'customers',
                            type: 'group',
                            fields: [
                                { name: 'id', type: 'text' },
                                { name: 'clientId', type: 'text' },
                                { name: 'clientSecret', type: 'text' },
                            ],
                        },
                    ],
                },
            ],
        },
        {
            name: 'integrations',
            type: 'group',
            fields: [
                {
                    name: 'judgeme',
                    type: 'group',
                    fields: [{ name: 'publicToken', type: 'text' }],
                },
            ],
        },
        { name: 'thirdParty', type: 'json' },
        {
            name: 'featureFlags',
            type: 'array',
            fields: [{ name: 'flag', type: 'relationship', relationTo: 'feature-flags' }],
        },
        {
            name: 'collaborators',
            type: 'array',
            fields: [
                { name: 'user', type: 'text' },
                { name: 'permissions', type: 'text', hasMany: true },
            ],
        },
    ),
};

const featureFlagsShape: ContentCollectionShape = {
    slug: 'feature-flags',
    fields: shape(
        { name: 'key', type: 'text', required: true, unique: true, index: true },
        selectField({
            name: 'kind',
            options: [
                { label: 'Behavior', value: 'behavior' },
                { label: 'Section', value: 'section' },
            ],
        }),
        textareaField({ name: 'description' }),
        required(jsonField({ name: 'defaultValue' })),
        arrayField({
            name: 'options',
            fields: [required(textField({ name: 'label' })), required(jsonField({ name: 'value' }))],
        }),
        {
            name: 'targeting',
            type: 'array',
            fields: [
                { name: 'rule', type: 'text', required: true },
                { name: 'params', type: 'json', required: true, defaultValue: {} },
                { name: 'value', type: 'json', required: true },
                { name: 'description', type: 'text' },
            ],
        },
    ),
};

const pagesShape: ContentCollectionShape = {
    slug: 'pages',
    fields: shape(
        localized(required(textField({ name: 'title' }))),
        { name: 'slug', type: 'text', required: true, index: true },
        { name: 'blocks', type: 'blocks', blocks: allBlockShapes },
        seoGroup(),
    ),
};

const articlesShape: ContentCollectionShape = {
    slug: 'articles',
    fields: shape(
        localized(required(textField({ name: 'title' }))),
        { name: 'slug', type: 'text', required: true, index: true },
        required(textField({ name: 'author' })),
        { name: 'publishedAt', type: 'date' },
        imageField({ name: 'cover' }),
        localized(textareaField({ name: 'excerpt' })),
        { name: 'body', type: 'json', localized: true },
        textField({ name: 'tags', hasMany: true }),
        seoGroup(),
    ),
};

const productMetadataShape: ContentCollectionShape = {
    slug: 'productMetadata',
    fields: shape(
        { name: 'shopifyHandle', type: 'text', required: true, index: true },
        { name: 'descriptionOverride', type: 'json', localized: true },
        { name: 'blocks', type: 'blocks', blocks: allBlockShapes },
        seoGroup(),
    ),
};

const collectionMetadataShape: ContentCollectionShape = {
    slug: 'collectionMetadata',
    fields: shape(
        { name: 'shopifyHandle', type: 'text', required: true, index: true },
        { name: 'descriptionOverride', type: 'json', localized: true },
        { name: 'blocks', type: 'blocks', blocks: allBlockShapes },
        seoGroup(),
    ),
};

const reviewsShape: ContentCollectionShape = {
    slug: 'reviews',
    fields: shape({ name: 'shop', type: 'relationship', relationTo: 'shops', required: true, index: true }),
};

const headerShape: ContentCollectionShape = {
    slug: 'header',
    fields: shape(
        imageField({ name: 'logo' }),
        textField({ name: 'logoLink', defaultValue: '/' }),
        topLevelNavItemField({ depth: 6 }),
        groupField({
            name: 'localeSwitcher',
            fields: [checkboxField({ name: 'enabled', defaultValue: true }), localized(textField({ name: 'label' }))],
        }),
        linkField({ name: 'cta' }),
    ),
};

const footerShape: ContentCollectionShape = {
    slug: 'footer',
    fields: shape(
        arrayField({
            name: 'sections',
            fields: [
                localized(required(textField({ name: 'title' }))),
                arrayField({ name: 'links', fields: [linkField({ name: 'link' })] }),
            ],
        }),
        arrayField({
            name: 'social',
            fields: [
                required(
                    selectField({
                        name: 'platform',
                        options: [
                            { label: 'Instagram', value: 'instagram' },
                            { label: 'Facebook', value: 'facebook' },
                            { label: 'TikTok', value: 'tiktok' },
                            { label: 'YouTube', value: 'youtube' },
                            { label: 'X / Twitter', value: 'x' },
                            { label: 'LinkedIn', value: 'linkedin' },
                        ],
                    }),
                ),
                required(textField({ name: 'url' })),
            ],
        }),
        arrayField({ name: 'legal', fields: [linkField({ name: 'link' })] }),
        localized(textField({ name: 'copyrightLine' })),
    ),
};

const businessDataShape: ContentCollectionShape = {
    slug: 'businessData',
    fields: shape(
        textField({ name: 'legalName' }),
        emailField({ name: 'supportEmail' }),
        textField({ name: 'supportPhone' }),
        groupField({
            name: 'address',
            fields: [
                textField({ name: 'line1' }),
                textField({ name: 'line2' }),
                textField({ name: 'city' }),
                textField({ name: 'region' }),
                textField({ name: 'postalCode' }),
                textField({ name: 'country' }),
            ],
        }),
        arrayField({
            name: 'profiles',
            fields: [
                required(textField({ name: 'platform' })),
                required(textField({ name: 'handle' })),
                textField({ name: 'url' }),
            ],
        }),
    ),
};

/**
 * Every collection's emit surface, in the deleted `allCollections` order — the
 * emission order of both the content-type interfaces and the Convex table
 * validators.
 */
export const allCollectionShapes: ContentCollectionShape[] = [
    usersShape,
    mediaShape,
    shopsShape,
    featureFlagsShape,
    pagesShape,
    articlesShape,
    productMetadataShape,
    collectionMetadataShape,
    reviewsShape,
    headerShape,
    footerShape,
    businessDataShape,
];
