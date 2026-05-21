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
};

export const MAX_BLOCK_DEPTH = 6;
