import { linkResolver } from '@/utils/prismic';
import { cn } from '@/utils/tailwind';
import { asLink, type Content } from '@prismicio/client';
import { PrismicNextImage } from '@prismicio/next';

import Link from '@/components/link';
import { PrismicText } from '@/components/typography/prismic-text';

import type { DropdownSliceDefaultPrimaryLinksItem, Simplify } from '@/prismic/types';
import type { SliceComponentProps } from '@prismicio/react';

type DropdownDefaultMenuProps = Pick<SliceComponentProps<Content.DropdownSlice>, 'slice'>;
export const DropdownDefaultMenu = ({ slice }: DropdownDefaultMenuProps) => {
    const commonStyles = 'h-full w-full max-w-[var(--page-width)] px-3 py-4 md:px-4 2xl:px-3';
    const links = slice.primary.links || [];

    // fixed top-28  group-data-[scrolled=false]/body:top-36
    return (
        <nav
            className={cn(
                commonStyles,
                'flex flex-col gap-2 md:grid md:auto-rows-max md:grid-cols-2 lg:grid-cols-3 lg:gap-3 xl:grid-cols-4'
            )}
        >
            {links.map((item, index) => {
                const { title, image, href } = item;

                const background = image.url ? image : null;
                const description = item.description.length > 0 ? item.description : null;
                const target = asLink(href, { linkResolver });

                if (!target) {
                    console.warn(`Could not resolve link "${JSON.stringify(href)}"`);
                    return null;
                }

                const titleStyles = 'text-xl leading-none py-2 font-semibold';

                let commonStyles = cn(
                    'group/item hover:border-primary hover:text-primary flex h-full grow overflow-hidden rounded-lg border border-solid border-gray-300 bg-white transition-colors duration-75',
                    background && 'grid grid-cols-1 grid-rows-1 items-center justify-start xl:grid-rows-1',
                    description && background && 'grid-rows-[4.25rem_1fr] xl:grid-rows-[4.25rem_1fr]'
                );
                let gradientStyles = '';
                let imagePositionStyles = 'object-center';

                switch (slice.variation) {
                    case 'default': {
                        const { shadow = true, image_position = 'center' } =
                            item as Simplify<DropdownSliceDefaultPrimaryLinksItem>;

                        if (shadow) {
                            gradientStyles = 'bg-gradient-to-b from-transparent to-[rgba(0,0,0,0.45)]';
                        }

                        switch (image_position) {
                            case 'center':
                                imagePositionStyles = 'object-center';
                                break;
                            case 'right':
                                imagePositionStyles = 'object-right';
                                break;
                            case 'left':
                                imagePositionStyles = 'object-left';
                                break;
                            case 'top':
                                imagePositionStyles = 'object-top';
                                break;
                            case 'bottom':
                                imagePositionStyles = 'object-bottom';
                                break;
                        }
                        break;
                    }
                }

                return (
                    <Link key={`${slice.id}_${target}_${index}`} href={target} className={cn(commonStyles)}>
                        {background ? (
                            <div
                                className={cn(
                                    'bg-primary text-primary-foreground relative h-full shrink-0 overflow-hidden'
                                )}
                            >
                                <PrismicNextImage
                                    field={
                                        {
                                            ...image,
                                            alt: image.alt || `© ${image.copyright}` || ''
                                        } as any
                                    }
                                    className={cn(
                                        'pointer-events-none h-full w-full object-cover object-center',
                                        imagePositionStyles
                                    )}
                                    draggable={false}
                                    priority={true}
                                    loading="eager"
                                    decoding="async"
                                />

                                <div
                                    className={cn(
                                        'absolute inset-0 flex h-full w-full items-end justify-start p-2 text-white',
                                        gradientStyles,
                                        titleStyles
                                    )}
                                    style={{
                                        textShadow: `1px 1px ${gradientStyles ? '8px' : '1px'} #000`
                                    }}
                                >
                                    <PrismicText data={title} styled={false} bare={true} />
                                </div>
                            </div>
                        ) : null}

                        <div className={cn('h-full p-2 pt-2 text-gray-600 empty:hidden group-hover/item:text-inherit')}>
                            {!background ? (
                                <div className={cn(titleStyles, 'pt-1')}>
                                    <PrismicText data={title} styled={false} bare={true} />
                                </div>
                            ) : null}

                            {description ? (
                                <div className="text-sm leading-tight">
                                    <PrismicText data={description} styled={false} bare={true} />
                                </div>
                            ) : null}
                        </div>
                    </Link>
                );
            })}
        </nav>
    );
};