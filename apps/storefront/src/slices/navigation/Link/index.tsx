'use client';

import { linkResolver } from '@/utils/prismic';
import { cn } from '@/utils/tailwind';
import { asLink, type Content } from '@prismicio/client';
import { type SliceComponentProps } from '@prismicio/react';
import { usePathname } from 'next/navigation';

import { LINK_ACTIVE_STYLES, LINK_STYLES } from '@/components/header/header-navigation';
import Link from '@/components/link';
import { useShop } from '@/components/shop/provider';
import { PrismicText } from '@/components/typography/prismic-text';

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

    let active = target ? target.toLowerCase().endsWith(pathname.toLowerCase()) : false;

    let linkStyles: string | undefined;
    switch (variant as any) {
        case 'highlighted':
            linkStyles = cn(
                LINK_STYLES,
                'px-3 py-0 md:px-3 h-8',
                active && LINK_ACTIVE_STYLES,
                'text-extrabold rounded-lg bg-secondary-light text-secondary-foreground',
                active && 'bg-primary text-primary-foreground'
            );
            break;
        default:
            linkStyles = cn(LINK_STYLES, active && LINK_ACTIVE_STYLES);
            break;
    }

    return (
        <Link key={slice.id} href={target} className={linkStyles} data-active={active}>
            <PrismicText data={title} styled={false} bare={true} />
        </Link>
    );
};

export default LinkSlice;
