import { TypeError } from '@nordcom/commerce-errors';
import type { Block } from 'payload';
import {
    arrayField,
    type BlockDescriptor,
    blocksField,
    checkboxField,
    codeField,
    condition,
    type FieldDescriptor,
    jsonField,
    localized,
    numberField,
    required,
    selectField,
    textareaField,
    textField,
} from '../descriptors';
import { imageField, linkField } from '../fields';
import { alertBlock } from './alert';
import { bannerBlock } from './banner';
import { collectionBlock } from './collection';
import { buildColumnsBlock } from './columns';
import { htmlBlock } from './html';
import { mediaGridBlock } from './media-grid';
import { overviewBlock } from './overview';
import { richTextBlock } from './rich-text';
import { vendorsBlock } from './vendors';

/**
 * Canonical, ordered list of every CMS block type. This is the single source
 * of truth for "which blocks exist" that every dispatch surface consumes — the
 * Payload block definitions (`allBlocks`), the CMS package's `BlockRenderer`,
 * and the storefront's `Blocks` dispatcher. Adding a block type here forces a
 * compile error in every `Record<BlockType, …>` render registry until the new
 * type is wired up, so the three dispatch surfaces can never silently drift.
 *
 * Kept CMS-safe on purpose: this module pulls in only Payload block schemas
 * (plain data) and the errors package — never React, Shopify, or storefront
 * code — so the block-loader firewall stays intact when the storefront imports
 * it at runtime.
 */
export const BLOCK_TYPES = [
    'columns',
    'alert',
    'banner',
    'collection',
    'html',
    'media-grid',
    'overview',
    'rich-text',
    'vendors',
] as const;

/**
 * Discriminant union of every known CMS block type, derived from
 * {@link BLOCK_TYPES}. Used as the exhaustive key set for the per-surface
 * render registries.
 */
export type BlockType = (typeof BLOCK_TYPES)[number];

/**
 * Leaf (non-columns) block definitions in admin display order. The columns
 * block is assembled separately because its nested `content` field must embed
 * every other block as a sibling (see {@link buildColumnsBlock}).
 */
const leafBlocks: Block[] = [
    alertBlock,
    bannerBlock,
    collectionBlock,
    htmlBlock,
    mediaGridBlock,
    overviewBlock,
    richTextBlock,
    vendorsBlock,
];

/**
 * Every Payload block definition, columns first so the editor surfaces the
 * layout block ahead of the leaves. Consumed by the `pages`,
 * `collection-metadata`, and `product-metadata` collections' `blocks` fields.
 */
export const allBlocks: Block[] = [buildColumnsBlock(leafBlocks), ...leafBlocks];

/** Slugs of {@link allBlocks}, in the same order. */
export const blockSlugs: string[] = allBlocks.map((b) => b.slug);

const BLOCK_TYPE_SET: ReadonlySet<string> = new Set(BLOCK_TYPES);

/**
 * Narrows an arbitrary block-type string to a known {@link BlockType}. The
 * dispatchers use this for graceful degradation: a CMS document referencing a
 * block type that ships before its renderer falls through to a no-op instead
 * of throwing.
 *
 * @param value - Raw `blockType` discriminant from a CMS block node.
 * @returns `true` when `value` is a registered block type.
 */
export function isBlockType(value: string): value is BlockType {
    return BLOCK_TYPE_SET.has(value);
}

/**
 * Strict counterpart to {@link isBlockType}: resolves a raw block-type string
 * to a known {@link BlockType} or throws. Use when an unknown block type is a
 * programming error rather than forward-compatible CMS content.
 *
 * @param value - Raw `blockType` discriminant to resolve.
 * @returns The validated {@link BlockType}.
 * @throws {TypeError} When `value` is not a registered block type.
 */
export function resolveBlockType(value: string): BlockType {
    if (isBlockType(value)) {
        return value;
    }

    throw new TypeError(`Unknown CMS block type "${value}"`);
}

/**
 * Field descriptors for the `alert` block. Mirrors `alertBlock`'s field set in
 * the editor's native descriptor DSL.
 */
const alertFields: FieldDescriptor[] = [
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
];

/**
 * Field descriptors for the `banner` block. Mirrors `bannerBlock`.
 */
const bannerFields: FieldDescriptor[] = [
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
];

/**
 * Field descriptors for the `collection` block. Mirrors `collectionBlock`; the
 * raw `handle`/`limit` Payload fields are re-expressed through the DSL (the
 * editor-only `admin.description` and numeric `min`/`max` bounds drop, exactly
 * as the descriptor builders model them elsewhere).
 */
const collectionFields: FieldDescriptor[] = [
    required(textField({ name: 'handle' })),
    localized(textField({ name: 'title' })),
    selectField({
        name: 'layout',
        defaultValue: 'grid',
        options: [
            { label: 'Grid', value: 'grid' },
            { label: 'Carousel', value: 'carousel' },
        ],
    }),
    numberField({ name: 'limit', defaultValue: 8 }),
];

/**
 * Field descriptors for the `html` block. Mirrors `htmlBlock`; the Payload
 * `access` admin-role gate is a server-side concern the editor descriptor omits.
 */
const htmlFields: FieldDescriptor[] = [required(codeField({ name: 'html', language: 'html' }))];

/**
 * Field descriptors for the `media-grid` block. Mirrors `mediaGridBlock`.
 */
const mediaGridFields: FieldDescriptor[] = [
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
    numberField({ name: 'columns', defaultValue: 3 }),
    arrayField({
        name: 'items',
        minRows: 1,
        fields: [imageField({ name: 'image' }), localized(textField({ name: 'caption' })), linkField({ name: 'link' })],
    }),
];

/**
 * Field descriptors for the `overview` block. Mirrors `overviewBlock`,
 * including the `collectionHandle` visibility condition.
 */
const overviewFields: FieldDescriptor[] = [
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
    numberField({ name: 'limit', defaultValue: 12 }),
];

/**
 * Field descriptors for the `rich-text` block. Mirrors `richTextBlock`; the
 * Lexical body has no descriptor kind yet, so it is modeled as a localized
 * `json` field (a Lexical document is a serializable JSON tree) until a
 * dedicated rich-text widget lands.
 */
const richTextFields: FieldDescriptor[] = [
    localized(jsonField({ name: 'body' })),
    checkboxField({ name: 'collapsible', defaultValue: false }),
    condition(
        checkboxField({ name: 'collapsedByDefault', defaultValue: false }),
        (_data, sibling) => sibling.collapsible === true,
    ),
    condition(localized(textField({ name: 'collapseLabel' })), (_data, sibling) => sibling.collapsible === true),
];

/**
 * Field descriptors for the `vendors` block. Mirrors `vendorsBlock`.
 */
const vendorsFields: FieldDescriptor[] = [
    localized(textField({ name: 'title' })),
    numberField({ name: 'maxVendors', defaultValue: 12 }),
];

/**
 * The eight non-columns block descriptors a `columns` block may embed in its
 * nested `content`. Excludes `columns` itself, mirroring `buildColumnsBlock`'s
 * sibling filter so a columns block can never nest another columns block.
 */
const columnsContentBlocks: BlockDescriptor[] = [
    { slug: 'alert', fields: alertFields },
    { slug: 'banner', fields: bannerFields },
    { slug: 'collection', fields: collectionFields },
    { slug: 'html', fields: htmlFields },
    { slug: 'media-grid', fields: mediaGridFields },
    { slug: 'overview', fields: overviewFields },
    { slug: 'rich-text', fields: richTextFields },
    { slug: 'vendors', fields: vendorsFields },
];

/**
 * Field descriptors for the `columns` block. Mirrors `buildColumnsBlock`: a
 * 1–4 row `columns` array, each row carrying a `width` choice and a nested
 * `content` blocks field that embeds every sibling block — the recursion the
 * blocks widget walks back through {@link RenderFields}.
 */
const columnsFields: FieldDescriptor[] = [
    arrayField({
        name: 'columns',
        minRows: 1,
        maxRows: 4,
        fields: [
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
            blocksField({ name: 'content', blocks: columnsContentBlocks }),
        ],
    }),
];

/**
 * Editor-native counterpart to {@link allBlocks}: maps every {@link BlockType}
 * to the {@link BlockDescriptor} the native form engine renders. The blocks
 * field widget resolves a row's `blockType` against this set and recurses each
 * block's `fields` through the field registry; the columns block nests the
 * other eight as siblings.
 *
 * `Record<BlockType, …>` is the CI-enforced exhaustiveness guard — adding a
 * member to {@link BLOCK_TYPES} fails `tsc --noEmit` here until the new type is
 * given a descriptor, mirroring the `CMS_BLOCKS` guard for the render registry.
 */
export const BLOCK_DESCRIPTORS: Record<BlockType, BlockDescriptor> = {
    columns: { slug: 'columns', fields: columnsFields },
    alert: { slug: 'alert', fields: alertFields },
    banner: { slug: 'banner', fields: bannerFields },
    collection: { slug: 'collection', fields: collectionFields },
    html: { slug: 'html', fields: htmlFields },
    'media-grid': { slug: 'media-grid', fields: mediaGridFields },
    overview: { slug: 'overview', fields: overviewFields },
    'rich-text': { slug: 'rich-text', fields: richTextFields },
    vendors: { slug: 'vendors', fields: vendorsFields },
};

/**
 * Every {@link BlockDescriptor} in canonical {@link BLOCK_TYPES} order. Feed to
 * a `blocksField` to allow authoring any block type, including `columns`.
 */
export const allBlockDescriptors: BlockDescriptor[] = BLOCK_TYPES.map((type) => BLOCK_DESCRIPTORS[type]);
