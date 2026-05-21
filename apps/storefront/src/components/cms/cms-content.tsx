import type { OnlineShop } from '@nordcom/commerce-db';
import { notFound } from 'next/navigation';
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
        notFound();
    }

    const blocks = ((page as { blocks?: BlockNode[] }).blocks ?? []) as BlockNode[];

    return <Blocks blocks={blocks} context={{ shop, locale }} />;
};

CMSContent.Skeleton = async ({}: CMSContentProps) => {
    // TODO: per-block skeletons. The current render layer streams via
    // Suspense at the page level, so this is a deliberate no-op for now.
    return null;
};
