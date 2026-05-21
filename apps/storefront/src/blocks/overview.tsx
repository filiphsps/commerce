import 'server-only';

import { Suspense } from 'react';
import CollectionBlockComponent from '@/components/products/collection-block';
import { Title } from '@/components/typography/heading';
import type { BlockContext } from './context';
import type { OverviewBlockNode } from './types';

/**
 * Renders the CMS Overview block. The Payload schema lets editors pick the
 * product source — a named Shopify collection, latest products, or featured
 * — but only the `'collection'` source maps cleanly to a single Shopify
 * query in this repo. The other two sources are placeholders that render
 * an empty section (Shopify doesn't expose canonical "latest" or
 * "featured" queries without storefront-side decisions about sort/filters).
 *
 * For the `'collection'` source we reuse the same `CollectionBlock` the
 * dedicated Collection block uses — keeps the visual treatment consistent
 * and avoids a parallel product-list component drifting out of sync.
 */
export const OverviewBlock = ({ block, context }: { block: OverviewBlockNode; context: BlockContext }) => {
    if (block.source !== 'collection' || !block.collectionHandle) {
        // YAGNI: `latest` and `featured` are schema placeholders. Wiring them
        // needs a product-of-the-month / new-arrivals API decision that
        // isn't made yet — render nothing rather than guessing.
        return null;
    }

    return (
        <section data-block-type="overview" data-source={block.source} className="flex w-full flex-col gap-3">
            {block.title ? (
                <Title as="h2" className="font-bold text-xl leading-tight lg:text-2xl">
                    {block.title}
                </Title>
            ) : null}
            <Suspense fallback={<CollectionBlockComponent.skeleton />}>
                <CollectionBlockComponent
                    shop={context.shop}
                    locale={context.locale}
                    handle={block.collectionHandle}
                    limit={block.limit ?? 12}
                    className="w-full"
                />
            </Suspense>
        </section>
    );
};

OverviewBlock.displayName = 'Nordcom.Blocks.Overview';
