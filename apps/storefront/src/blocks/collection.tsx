import 'server-only';

import { Suspense } from 'react';
import CollectionBlockComponent from '@/components/products/collection-block';
import { Title } from '@/components/typography/heading';
import { cn } from '@/utils/tailwind';
import type { BlockContext } from './context';
import { textOf } from './payload-value';
import type { CollectionBlockNode } from './types';

/**
 * Renders the CMS Collection block. Mirrors the old Prismic `Collection`
 * slice — delegates the actual product grid to the shared
 * `CollectionBlock` component (which talks to Shopify) and just owns the
 * title/wrapper.
 *
 * `layout: 'carousel'` maps to `isHorizontal`; `layout: 'grid'` is the
 * default. We don't render a Suspense fallback for the title because it's
 * static; the inner CollectionBlock streams in via its own Suspense.
 */
export const CollectionBlock = ({
    block,
    context,
    index = 0,
}: {
    block: CollectionBlockNode;
    context: BlockContext;
    /** Forwarded to the inner CollectionBlock for image priority hints. */
    index?: number;
}) => {
    const isHorizontal = block.layout === 'carousel';
    const title = textOf(block.title);

    return (
        <section
            data-block-type="collection"
            data-layout={block.layout}
            className={cn('flex w-full flex-col items-start justify-start gap-4 self-start')}
        >
            {title ? (
                <Title as="h2" className="font-bold text-xl leading-tight lg:text-2xl">
                    {title}
                </Title>
            ) : null}

            <Suspense fallback={<CollectionBlockComponent.skeleton isHorizontal={isHorizontal} />}>
                <CollectionBlockComponent
                    shop={context.shop}
                    locale={context.locale}
                    handle={block.handle}
                    isHorizontal={isHorizontal}
                    limit={block.limit ?? 16}
                    priority={index < 3}
                    className="w-full"
                />
            </Suspense>
        </section>
    );
};

CollectionBlock.displayName = 'Nordcom.Blocks.Collection';

/**
 * Loading placeholder for the Collection block. Preserves the static
 * title (the title is already on the block — no fetch needed) and
 * defers the product grid placeholder to the underlying
 * `CollectionBlock.skeleton`, which already mirrors the live grid's
 * track count and card size.
 *
 * Used by `Blocks.Skeleton` for the pre-load placeholder. The live
 * `CollectionBlock` also wraps its own grid in a `Suspense` boundary
 * with the same skeleton, so streaming behavior is the same regardless
 * of which path renders first.
 */
const CollectionBlockSkeleton = ({ block }: { block: CollectionBlockNode }) => {
    const isHorizontal = block.layout === 'carousel';
    return (
        <section
            data-block-type="collection"
            data-layout={block.layout}
            data-skeleton-variant="collection"
            className={cn('flex w-full flex-col items-start justify-start gap-4 self-start')}
        >
            {block.title ? <div className="h-7 w-48 rounded-sm lg:h-8" data-skeleton /> : null}
            <CollectionBlockComponent.skeleton isHorizontal={isHorizontal} />
        </section>
    );
};
CollectionBlockSkeleton.displayName = 'Nordcom.Blocks.Collection.Skeleton';
CollectionBlock.Skeleton = CollectionBlockSkeleton;
