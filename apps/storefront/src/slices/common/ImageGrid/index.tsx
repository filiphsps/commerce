import 'server-only';

import { linkResolver } from '@/utils/prismic';
import { cn } from '@/utils/tailwind';
import { asLink, asText, type Content } from '@prismicio/client';
import Image from 'next/image';

import Link from '@/components/link';
import { PrismicText } from '@/components/typography/prismic-text';

import type { SliceComponentProps } from '@prismicio/react';

/**
 * Props for `ImageGrid`.
 */
export type ImageGridProps = SliceComponentProps<Content.ImageGridSlice>;

/**
 * Component for "ImageGrid" Slices.
 */
const ImageGrid = ({ slice, index }: ImageGridProps) => {
    if (slice.items.length <= 0) {
        return null;
    }

    return (
        <section
            className="grid grid-cols-1 gap-2 empty:hidden sm:grid-cols-2 md:grid-cols-3"
            data-slice-type={slice.slice_type}
            data-slice-variation={slice.variation}
        >
            {slice.items.map(({ href: link, title, description, image }) => {
                if (!image.url) {
                    return null;
                }

                // Handle old titles that were `KeyTextField`s.
                const titleText = title && typeof title !== 'string' ? asText(title).trim() : (title as string).trim();
                const descriptionText = description ? asText(description).trim() : '';
                const isInlineTitle = descriptionText.length <= 0 && titleText.length > 0 && titleText.length < 65;

                // Handle old links that were `KeyTextField`s.
                const href = link && typeof link !== 'string' ? asLink(link, { linkResolver }) : link;
                const target: undefined | '_blank' = (href as any).target || undefined;

                const WrapperTag = href ? Link : 'div';

                return (
                    <WrapperTag
                        key={href!}
                        className="group/item relative flex flex-col gap-1"
                        title={titleText}
                        href={href!}
                        target={target}
                    >
                        <Image
                            role={image.alt ? undefined : 'presentation'}
                            src={image.url!}
                            alt={image.alt!}
                            width={300}
                            height={200}
                            quality={70}
                            sizes="(max-width: 950px) 250px, 25vw"
                            draggable={false}
                            decoding="async"
                            // If we're positioned high up in the page, we want to load the image
                            // immediately. Otherwise, we can wait until the browser decides to.
                            priority={index < 2}
                            className="bg-primary w-full rounded-lg object-cover object-center shadow transition-all group-focus-within/item:brightness-75 group-hover/item:brightness-75"
                        />

                        <div
                            className={cn(
                                'empty:hidden',
                                isInlineTitle &&
                                    'absolute inset-auto bottom-3 right-3 ml-3 rounded-lg bg-gray-100/95 px-3 py-2 text-gray-700 shadow transition-all group-focus-within/item:brightness-75 group-hover/item:brightness-75'
                            )}
                        >
                            {titleText.length > 0 ? (
                                <div
                                    className={cn(
                                        'font-semibold transition-colors',
                                        isInlineTitle && 'line-clamp-1 leading-none text-inherit',
                                        descriptionText.length > 0 &&
                                            'group-hover/item:text-primary text-xl text-gray-600'
                                    )}
                                >
                                    {typeof title !== 'string' ? <PrismicText data={title} /> : (title as string)}
                                </div>
                            ) : null}
                            {descriptionText.length > 0 ? (
                                <div className="group-focus-within/item:text-primary group-hover/item:text-primary text-sm leading-tight transition-colors">
                                    <PrismicText data={description} />
                                </div>
                            ) : null}
                        </div>
                    </WrapperTag>
                );
            })}
        </section>
    );
};
ImageGrid.displayName = 'Nordcom.Slices.ImageGrid';

ImageGrid.skeleton = ImageGrid;
(ImageGrid.skeleton as any).displayName = 'Nordcom.Slices.ImageGrid.Skeleton';

export default ImageGrid;
