import { linkResolver } from '@/utils/prismic';
import { cn } from '@/utils/tailwind';
import { asLink, type Content } from '@prismicio/client';
import Image from 'next/image';

import { useHeaderMenu } from '@/components/header/header-provider';
import Link from '@/components/link';
import { PrismicText } from '@/components/typography/prismic-text';

import type { DropdownSliceDefaultPrimaryLinksItem, Simplify } from '@/prismic/types';
import type { SliceComponentProps } from '@prismicio/react';

const MENU_COMMON_STYLES = 'h-full w-full max-w-[var(--page-width)] px-3 py-4 md:px-4 2xl:px-3 overflow-x-auto ';
const MENU_ITEM_COMMON_STYLES =
    'group/item hover:border-primary hover:text-primary flex h-full grow overflow-hidden rounded-lg border border-solid border-gray-300 bg-white transition-colors duration-75';
const TITLE_COMMON_STYLES = 'text-xl leading-none py-2 font-semibold';

type DropdownDefaultMenuProps = Pick<SliceComponentProps<Content.DropdownSlice>, 'slice'>;
export const DropdownDefaultMenu = ({ slice }: DropdownDefaultMenuProps) => {
    const { closeMenu } = useHeaderMenu();
    const links: typeof slice.primary.links = (slice.primary.links as any) || [];

    return (
        <nav
            className={cn(
                MENU_COMMON_STYLES,
                'z-10 flex max-h-[calc(100vh-10rem)] flex-col gap-3 md:grid md:max-h-none md:auto-rows-max md:grid-cols-2 lg:grid-cols-3 lg:gap-2 xl:grid-cols-4'
            )}
        >
            {links.map((item, index) => {
                const { title, image, href, background_color } = item;

                const background = image.url ? image : null;
                const description = item.description.length > 0 ? item.description : null;
                const target = asLink(href, { linkResolver });

                if (!target) {
                    console.warn(`Could not resolve link "${JSON.stringify(href)}"`);
                    return null;
                }

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
                    <Link
                        key={`${slice.id}_${target}_${index}`}
                        href={target}
                        className={cn(
                            MENU_ITEM_COMMON_STYLES,
                            background &&
                                'grid min-h-min grid-cols-1 grid-rows-1 items-center justify-start xl:grid-rows-1',
                            description && background && 'grid-rows-[4.25rem_1fr] xl:grid-rows-[4.25rem_1fr]'
                        )}
                        onClick={() => closeMenu()}
                    >
                        {background && !!(image as any) && image.url ? (
                            <div
                                className={cn(
                                    'text-primary-foreground relative h-full shrink-0 overflow-hidden',
                                    !background_color && 'bg-primary' // FIXME: Deal with text color when custom bg color is used.
                                )}
                                style={{ backgroundColor: background_color || undefined }}
                            >
                                <Image
                                    src={image.url}
                                    alt={image.alt || `© ${image.copyright}` || ''}
                                    width={image.dimensions.width}
                                    height={image.dimensions.height}
                                    quality={80}
                                    className={cn(
                                        'pointer-events-none h-full w-full object-cover',
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
                                        TITLE_COMMON_STYLES
                                    )}
                                    style={{
                                        WebkitTextStroke: '.15rem rgba(0,0,0,.25)',
                                        paintOrder: 'stroke fill',
                                        ...(!background_color && {
                                            textShadow: `1px 1px {gradientStyles ? '8px' : '1px'} #000`
                                        })
                                    }}
                                >
                                    <PrismicText data={title} styled={false} bare={true} />
                                </div>
                            </div>
                        ) : null}

                        <div className={cn('h-full p-2 pt-2 text-gray-600 empty:hidden group-hover/item:text-inherit')}>
                            {!background ? (
                                <div className={cn(TITLE_COMMON_STYLES, 'pt-1')}>
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
