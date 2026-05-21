import 'server-only';

import { Suspense } from 'react';
import CollectionBlockComponent from '@/components/products/collection-block';
import { Title } from '@/components/typography/heading';
import { cn } from '@/utils/tailwind';
import type { BlockContext } from './context';
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

    return (
        <section
            data-block-type="collection"
            data-layout={block.layout}
            className={cn('flex w-full flex-col items-start justify-start gap-4 self-start')}
        >
            {block.title ? (
                <Title as="h2" className="font-bold text-xl leading-tight lg:text-2xl">
                    {block.title}
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
