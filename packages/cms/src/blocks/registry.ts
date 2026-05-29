import { TypeError } from '@nordcom/commerce-errors';
import type { Block } from 'payload';
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
