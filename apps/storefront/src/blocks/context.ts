import type { OnlineShop } from '@nordcom/commerce-db';
import type { Locale } from '@/utils/locale';

/**
 * Shared context threaded through the Blocks dispatcher into each block
 * component. Mirrors the Prismic slice context (`shop`, `locale`, `i18n`,
 * `pageContent`) so block components keep the same call shape — but stays
 * thin: i18n is loaded lazily inside the blocks that need it, not eagerly
 * here, because most blocks don't read it.
 *
 * `depth` is incremented by the Columns block so nested Blocks calls can
 * cap recursion before MongoDB/runtime nests blow up.
 */
export type BlockContext = {
    shop: OnlineShop;
    locale: Locale;
    /** Tracks Blocks→Columns→Blocks nesting; clamped by the dispatcher. */
    depth?: number;
    /**
     * True only when rendered inside the admin CMS preview iframe (draft mode).
     * Gates the `data-cms-field` hints the live-preview bridge patches, so a
     * normal visitor's HTML carries zero preview footprint.
     */
    preview?: boolean;
    /**
     * Dotted form-state path of the blocks array these nodes render from
     * (`'blocks'`), used to build `data-cms-field` paths in preview. Only set on
     * the top-level render; absent inside nested blocks, which fall back to the
     * refresh channel.
     */
    path?: string;
};

export const MAX_BLOCK_DEPTH = 256;

/**
 * Builds the `data-cms-field` attribute for a top-level block's plain-text leaf,
 * but ONLY in preview — so the live-preview bridge can patch it instantly while
 * a normal render emits nothing. Returns an empty object (no attribute) outside
 * preview, without a known blocks `path`, or for nested blocks (depth > 0),
 * which reconcile through the slower refresh channel instead.
 *
 * @param context - The block render context.
 * @param index - The block's positional index in the top-level blocks array.
 * @param field - The leaf field name (e.g. `heading`), appended to the block path.
 * @returns `{ 'data-cms-field': '<path>.<index>.<field>' }` in preview, else `{}`.
 */
export function cmsFieldAttrs(context: BlockContext, index: number, field: string): { 'data-cms-field'?: string } {
    if (!context.preview || !context.path || (context.depth ?? 0) !== 0) return {};
    return { 'data-cms-field': `${context.path}.${index}.${field}` };
}
