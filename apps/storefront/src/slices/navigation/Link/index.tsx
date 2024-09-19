'use client';

import { linkResolver } from '@/utils/prismic';
import { cn } from '@/utils/tailwind';
import { asLink } from '@prismicio/client';
import { usePathname } from 'next/navigation';

import Link from '@/components/link';
import { useShop } from '@/components/shop/provider';
import { PrismicText } from '@/components/typography/prismic-text';

import type { Content } from '@prismicio/client';
import type { SliceComponentProps } from '@prismicio/react';

export const LINK_STYLES =
    'group/menu-item flex h-full cursor-pointer select-none flex-nowrap items-center justify-center text-nowrap border-0 border-b-2 border-t-2 border-solid border-transparent border-t-transparent bg-transparent my-4 font-medium leading-none transition-all md:my-3';
export const LINK_BUBBLE_STYLES =
    '-mx-2 rounded-lg px-2 py-2 group-hover/menu-item:bg-gray-100 group-focus-within/menu-item:bg-gray-100 text-inherit';

export const LINK_ACTIVE_MENU_STYLES = 'bg-gray-100 px-2 font-semibold text-primary  -mx-2';
export const LINK_ACTIVE_STYLES = 'border-b-primary font-bold text-primary hover:text-primary';

export type LinkProps = {} & SliceComponentProps<Content.LinkSlice, { isHeader: boolean }>;
const LinkSlice = ({ slice, context: { isHeader = true } }: LinkProps) => {
    const { locale } = useShop();
    const pathname = usePathname().slice(1).split('/').slice(1).join('/') || `/${locale.code}/`;

    // Don't render the link slice as a standalone menu.
    if (!isHeader) {
        return null;
    }

    const link = slice.primary.href;
    const title = slice.primary.title;
    const variant = slice.variation;

    const resolvedPrismicLink = asLink(link, { linkResolver });
    let target = `/${locale.code}/`;
    if (resolvedPrismicLink.startsWith('/')) {
        target += resolvedPrismicLink.slice(1);

        // Make sure the target ends with a slash.
        // TODO: Maybe this should be a utility function that wraps `asLink`?
        if (!target.endsWith('/')) {
            target = `${target}/`;
        }
    }

    let active = target ? target.toLowerCase().endsWith(pathname.trim().toLowerCase()) : false;

    switch (variant as any) {
        case 'highlighted': {
            return (
                <Link
                    key={slice.id}
                    href={target}
                    className={cn(
                        LINK_STYLES,
                        'h-8 rounded-lg px-3 py-0 transition-all hover:brightness-75 focus:brightness-75 md:px-3',
                        active && LINK_ACTIVE_STYLES,
                        'text-bold bg-secondary text-secondary-foreground',
                        active && 'bg-primary text-primary-foreground'
                    )}
                    data-active={active}
                >
                    <PrismicText data={title} styled={false} bare={true} />
                </Link>
            );
        }
        default:
            break;
    }

    return (
        <Link
            key={slice.id}
            href={target}
            className={cn(LINK_STYLES, active && LINK_ACTIVE_STYLES)}
            data-active={active}
        >
            <div className={LINK_BUBBLE_STYLES}>
                <PrismicText data={title} styled={false} bare={true} />
            </div>
        </Link>
    );
};

export default LinkSlice;
