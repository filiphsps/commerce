'use client';

import type { Collection } from '@shopify/hydrogen-react/storefront-api-types';
import Link from '@/components/link';
import { cn } from '@/utils/tailwind';

export type CollectionViewAllTileProps = {
    collection: Pick<Collection, 'handle' | 'title'>;
    /** Localized template with a `{0}` placeholder for the collection title; defaults to English. */
    template?: string;
    className?: string;
};

const DEFAULT_TEMPLATE = 'View all of the products in {0}.';

/**
 * Card-sized tile linking to the full collection page, displayed after the product grid.
 *
 * Builds the emphasized title client-side rather than receiving a pre-rendered
 * `<b>` element from the server: a server-created element threaded through the
 * client `Link` inside the page's `'use cache'` boundary loses its dev metadata
 * on the cache serialize→deserialize round-trip, which crashes React's Flight
 * dev serializer ("Attempted to render <b> without development properties").
 * Splitting the localized `{0}` template here keeps the title's per-locale
 * position correct while the bold element is only ever created on the client.
 *
 * @param props.collection - Collection providing handle and title for the link.
 * @param props.template - Localized sentence with a `{0}` placeholder for the title; falls back to English.
 * @param props.className - Additional CSS class names.
 * @returns The link tile element.
 */
const CollectionViewAllTile = ({ collection, template, className }: CollectionViewAllTileProps) => {
    const raw = template ?? DEFAULT_TEMPLATE;
    const placeholderIndex = raw.indexOf('{0}');
    const before = placeholderIndex >= 0 ? raw.slice(0, placeholderIndex) : raw;
    const after = placeholderIndex >= 0 ? raw.slice(placeholderIndex + '{0}'.length) : '';

    return (
        <Link
            href={`/collections/${collection.handle}/`}
            className={cn(
                'group/card relative flex w-full snap-center snap-always items-center justify-center overflow-hidden transition-all',
                'min-h-[18rem]',
                'rounded-(--product-card-radius)',
                'border-(length:--product-card-border-width) border-(color:var(--product-card-border-color)) border-solid',
                'bg-primary p-(--product-card-padding) text-primary-foreground',
                'hover:brightness-95',
                className,
            )}
        >
            <div className="text-center text-inherit">
                {before}
                {placeholderIndex >= 0 ? <b className="font-bold">{collection.title}</b> : null}
                {after}
            </div>
        </Link>
    );
};

CollectionViewAllTile.displayName = 'Nordcom.Products.CollectionViewAllTile';
export default CollectionViewAllTile;
