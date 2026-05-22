import 'server-only';

import type { Collection } from '@shopify/hydrogen-react/storefront-api-types';
import Link from '@/components/link';
import { cn } from '@/utils/tailwind';

export type CollectionViewAllTileProps = {
    collection: Pick<Collection, 'handle' | 'title'>;
    className?: string;
};

const CollectionViewAllTile = ({ collection, className }: CollectionViewAllTileProps) => (
    <Link
        href={`/collections/${collection.handle}/`}
        className={cn(
            'group/card relative flex w-full snap-center snap-always items-center justify-center overflow-hidden transition-all',
            'min-h-[18rem]',
            'rounded-(--product-card-radius)',
            'border-(length:--product-card-border-width) border-solid border-(color:var(--product-card-border-color))',
            'bg-primary p-(--product-card-padding) text-primary-foreground',
            'hover:brightness-95',
            className,
        )}
    >
        <div className="text-center text-inherit">
            View all of the products in <b className="font-bold">{collection.title}</b>.
        </div>
    </Link>
);

CollectionViewAllTile.displayName = 'Nordcom.Products.CollectionViewAllTile';
export default CollectionViewAllTile;
