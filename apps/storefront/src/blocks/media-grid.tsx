import Image from 'next/image';
import type { JSX, ReactNode } from 'react';
import Link from '@/components/link';
import { cn } from '@/utils/tailwind';
import type { BlockContext } from './context';
import { type ResolvedLink, resolveLink } from './resolve-link';
import type { MediaGridBlockNode, MediaItem } from './types';

/**
 * Extracts the displayable metadata from a `MediaItem`. The Payload media
 * document ID (`id`) is returned so callers can build stable React keys —
 * using the URL alone collides when the same asset appears twice in a grid.
 *
 * @param item - The CMS media item to extract metadata from.
 * @returns The media document ID, resolved URL, and alt text.
 */
const imageMeta = (item: MediaItem): { id?: string; url?: string; alt: string } => {
    if (!item.image) return { id: undefined, url: undefined, alt: '' };
    if (typeof item.image === 'string') return { id: item.image, url: undefined, alt: '' };
    return { id: item.image.id, url: item.image.url, alt: item.image.alt ?? '' };
};

/**
 * Wraps media grid children in a `Link` when a resolved link is present,
 * falling back to a plain `div`. The component-type union approach isn't
 * used here because TypeScript can't narrow the prop union when the component
 * type itself is a union — splitting at the call site is the simplest
 * type-safe shape.
 *
 * @param link - The resolved link target, or `null` for an unlinked item.
 * @param title - Optional title attribute forwarded to the wrapper element.
 * @param className - Class string applied to the wrapper element.
 * @param children - The media content to wrap.
 * @returns A `Link` element when linked, otherwise a `div`.
 */
const ItemWrapper = ({
    link,
    title,
    className,
    children,
}: {
    link: ResolvedLink | null;
    title?: string;
    className: string;
    children: ReactNode;
}) => {
    if (link) {
        return (
            <Link
                className={className}
                href={link.href}
                target={link.openInNewTab ? '_blank' : undefined}
                title={title}
            >
                {children}
            </Link>
        );
    }
    return (
        <div className={className} title={title}>
            {children}
        </div>
    );
};
ItemWrapper.displayName = 'Nordcom.Blocks.MediaGrid.Item';

/**
 * Renders the CMS media-grid block. Combines the old Prismic `ImageGrid`
 * and `IconGrid` slices — `itemType: 'image'` produces a tile grid with
 * captions, `itemType: 'icon'` produces a smaller chip layout.
 *
 * Column count is editor-supplied (1–6); we cap the responsive grid at
 * the schema's max, mobile collapses to a single column for legibility.
 *
 * @param block - The CMS media-grid block node with items, column count, and item type.
 * @param context - Render context carrying locale used for link resolution.
 * @returns The rendered media-grid section, or `null` when the block has no items.
 */
export const MediaGridBlock = ({
    block,
    context,
}: {
    block: MediaGridBlockNode;
    context: BlockContext;
}): JSX.Element | null => {
    if (!block.items?.length) return null;

    const isIcon = block.itemType === 'icon';

    return (
        <section
            data-block-type="media-grid"
            data-item-type={block.itemType}
            className={cn(
                'grid w-full gap-2 empty:hidden md:gap-3',
                'grid-cols-1',
                'sm:grid-cols-2',
                block.columns === 1 && 'md:grid-cols-1',
                block.columns === 2 && 'md:grid-cols-2',
                block.columns === 3 && 'md:grid-cols-3',
                block.columns === 4 && 'md:grid-cols-4',
                block.columns === 5 && 'md:grid-cols-5',
                block.columns === 6 && 'md:grid-cols-6',
            )}
        >
            {block.items.map((item, index) => {
                const { id, url, alt } = imageMeta(item);
                if (!url) return null;

                const link = resolveLink(item.link, { locale: context.locale });
                // Prefer the Payload media ID so reordering items in the
                // editor doesn't remount every tile. Suffix with the array
                // index so the same asset reused twice in one grid still
                // produces unique keys.
                const key = `${id ?? url}-${index}`;

                if (isIcon) {
                    return (
                        <ItemWrapper
                            key={key}
                            link={link}
                            className="group/item flex items-center justify-center gap-4 rounded-lg border-2 border-transparent border-solid bg-gray-50 p-4 transition-colors hover:bg-gray-100"
                        >
                            <Image
                                role={alt ? undefined : 'presentation'}
                                className="h-8 w-8 select-none object-contain object-center md:h-6 md:w-6"
                                src={url}
                                alt={alt}
                                width={48}
                                height={48}
                                quality={75}
                                decoding="async"
                                priority={index < 2}
                                draggable={false}
                            />
                            {item.caption ? (
                                <div className="font-semibold text-sm leading-tight lg:text-base">{item.caption}</div>
                            ) : null}
                        </ItemWrapper>
                    );
                }

                return (
                    <ItemWrapper
                        key={key}
                        link={link}
                        title={item.caption || undefined}
                        className="group/item relative flex flex-col gap-1"
                    >
                        <div className="aspect-4/3 w-full overflow-clip rounded-lg bg-primary shadow">
                            <Image
                                role={alt ? undefined : 'presentation'}
                                src={url}
                                alt={alt}
                                width={600}
                                height={450}
                                quality={70}
                                sizes="(max-width: 950px) 250px, 25vw"
                                draggable={false}
                                decoding="async"
                                priority={index < 2}
                                className="h-full w-full object-cover object-center transition-all group-focus-within/item:brightness-75 group-hover/item:scale-105 group-hover/item:brightness-90"
                            />
                        </div>
                        {item.caption ? (
                            <div className="font-semibold text-sm leading-tight transition-colors group-focus-within/item:text-primary group-hover/item:text-primary">
                                {item.caption}
                            </div>
                        ) : null}
                    </ItemWrapper>
                );
            })}
        </section>
    );
};

MediaGridBlock.displayName = 'Nordcom.Blocks.MediaGrid';

/**
 * Loading placeholder for the media-grid block. Renders the same grid
 * tracks (column count + responsive collapse) and one tile per editor-
 * configured item — the items array shape is already on the block, so
 * the skeleton can exactly match the loaded layout.
 *
 * Tile aspect ratio mirrors the live block (4:3 for images, square chip
 * for icons) so images popping in don't shift the page.
 *
 * @param block - The CMS media-grid block node; used to mirror grid structure and item count.
 * @returns The skeleton media-grid section, or `null` when the block has no items.
 */
const MediaGridBlockSkeleton = ({ block }: { block: MediaGridBlockNode }): JSX.Element | null => {
    if (!block.items?.length) return null;
    const isIcon = block.itemType === 'icon';
    return (
        <section
            data-block-type="media-grid"
            data-item-type={block.itemType}
            data-skeleton-variant="media-grid"
            className={cn(
                'grid w-full gap-2 empty:hidden md:gap-3',
                'grid-cols-1',
                'sm:grid-cols-2',
                block.columns === 1 && 'md:grid-cols-1',
                block.columns === 2 && 'md:grid-cols-2',
                block.columns === 3 && 'md:grid-cols-3',
                block.columns === 4 && 'md:grid-cols-4',
                block.columns === 5 && 'md:grid-cols-5',
                block.columns === 6 && 'md:grid-cols-6',
            )}
        >
            {block.items.map((item, index) => {
                const { id } = imageMeta(item);
                const key = `${id ?? 'tile'}-${index}`;
                return isIcon ? (
                    <div
                        key={key}
                        className="flex items-center justify-center gap-4 rounded-lg border-2 border-transparent border-solid bg-gray-50 p-4"
                    >
                        <div className="h-8 w-8 rounded-sm md:h-6 md:w-6" data-skeleton />
                        {item.caption ? <div className="h-4 w-24 rounded-sm" data-skeleton /> : null}
                    </div>
                ) : (
                    <div key={key} className="flex flex-col gap-1">
                        <div className="aspect-4/3 w-full overflow-clip rounded-lg shadow" data-skeleton />
                        {item.caption ? <div className="h-4 w-3/4 rounded-sm" data-skeleton /> : null}
                    </div>
                );
            })}
        </section>
    );
};
MediaGridBlockSkeleton.displayName = 'Nordcom.Blocks.MediaGrid.Skeleton';
MediaGridBlock.Skeleton = MediaGridBlockSkeleton;
