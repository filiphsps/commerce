import type { OnlineShop } from '@nordcom/commerce-db';
import { isDraftModeEnabled } from '@/api/_draft';
import { ResolvedExtensionsApi } from '@/api/extensions';
import { PageApi } from '@/api/page';
import { Blocks } from '@/blocks/blocks';
import type { BlockNode } from '@/blocks/types';
import type { Locale } from '@/utils/locale';

export type CMSContentProps = {
    shop: OnlineShop;
    locale: Locale;
    handle: string;
};

/**
 * Renders a CMS-backed page by handle. Pulls the Payload `Page` doc via
 * `PageApi`, then hands its `blocks` array to the storefront-native
 * `Blocks` dispatcher.
 *
 * Returns `null` when no CMS doc exists for the handle — this slot is
 * optional supplemental content layered on top of Shopify products and
 * collections, so a missing doc must not 404 the host page.
 *
 * The dispatcher owns block-by-block rendering — see
 * `apps/storefront/src/blocks/`. We intentionally do NOT use
 * `@nordcom/commerce-cms`'s `BlockRenderer`: the storefront blocks are
 * styled with the same tokens / shared components (Alert, Content,
 * CollectionBlock) as the rest of the site, while the CMS package's
 * renderer ships a minimal generic markup intended for testing the
 * editor surface, not for production styling.
 */
export const CMSContent = async ({ shop, locale, handle }: CMSContentProps) => {
    const page = await PageApi({ shop, locale, handle });
    if (!page) {
        return null;
    }

    // `preview` is true only inside the admin preview iframe; it gates the
    // `data-cms-field` hints the live-preview bridge patches, so a normal render
    // emits none. `path` is the blocks array's form-state path the admin keys its
    // optimistic patches by.
    const preview = await isDraftModeEnabled();

    // Resolve the per-shop extension config once and thread it down through the dispatcher so every
    // block reads its store-wide defaults from one resolved source (absent manifest → today's render).
    const config = ResolvedExtensionsApi({ shop });

    return <Blocks blocks={page.blocks as BlockNode[]} context={{ shop, locale, preview, path: 'blocks', config }} />;
};

/**
 * Loading placeholder shown while the page's blocks are being fetched.
 * The page document hasn't loaded yet at this boundary, so we don't know
 * the editor-configured block layout — render a small, representative
 * stack (banner + rich-text + collection grid) sized to a typical page
 * so the layout doesn't pop when content arrives.
 *
 * Once the blocks array is known, the inner data-fetching blocks
 * (Collection, Overview, Vendors) carry their own `Suspense` boundaries
 * with shape-aware fallbacks from `Blocks.Skeleton`, so this generic
 * placeholder only ever shows during the initial Page fetch.
 */
const CMSContentSkeleton = (_: CMSContentProps) => {
    return (
        <div data-block-type="cms-content" data-skeleton-variant="page" className="flex w-full flex-col gap-6">
            <div className="h-48 w-full rounded-lg md:h-64" data-skeleton />

            <section className="prose mx-auto flex w-full max-w-prose flex-col gap-2">
                <div className="h-4 w-full rounded-sm" data-skeleton />
                <div className="h-4 w-11/12 rounded-sm" data-skeleton />
                <div className="h-4 w-9/12 rounded-sm" data-skeleton />
            </section>

            <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 md:gap-3">
                {Array.from({ length: 6 }).map((_x, idx) => (
                    <div key={idx} className="aspect-4/3 w-full overflow-clip rounded-lg shadow" data-skeleton />
                ))}
            </div>
        </div>
    );
};
CMSContentSkeleton.displayName = 'Nordcom.CMSContent.Skeleton';
CMSContent.Skeleton = CMSContentSkeleton;
