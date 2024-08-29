import { linkResolver } from '@/utils/prismic';
import { cn } from '@/utils/tailwind';
import { asLink, type Content } from '@prismicio/client';
import { type SliceComponentProps } from '@prismicio/react';

import { LINK_ACTIVE_STYLES, LINK_STYLES } from '@/components/header/header-navigation';
import Link from '@/components/link';
import { PrismicText } from '@/components/typography/prismic-text';

export type LinkProps = {} & SliceComponentProps<Content.LinkSlice, { isHeader: boolean; pathname: string }>;
const LinkSlice = ({ slice, context: { isHeader = true, pathname } }: LinkProps) => {
    // Don't render the link slice as a standalone menu.
    if (!isHeader) return null;

    const link = slice.primary.href;
    const title = slice.primary.title;
    const variant = slice.variation;

    let target = asLink(link, { linkResolver });
    // Make sure the target ends with a slash.
    // TODO: This should be a utility function that wraps `asLink`.
    if (target && target.length > 1 && !target.endsWith('/')) {
        target = `${target}/`;
    }

    let active = target ? pathname.toLowerCase().endsWith(target.toLowerCase()) : false;
    // Handle homepage.
    if (active && target === '/') {
        active = pathname.split('/').length === 3;
    }

    let linkStyles = '';
    switch (variant as any) {
        case 'highlighted':
            linkStyles =
                cn(
                    LINK_STYLES,
                    'px-3 py-0 md:px-3 h-8',
                    active && LINK_ACTIVE_STYLES,
                    'text-extrabold rounded-lg bg-secondary-light text-secondary-foreground',
                    active && 'bg-primary text-primary-foreground'
                ) || '';
            break;
        default:
            linkStyles = cn(LINK_STYLES, active && LINK_ACTIVE_STYLES) || '';
            break;
    }

    return (
        <Link key={slice.id} href={target} className={linkStyles} data-active={active}>
            <PrismicText data={title} styled={false} bare={true} />
        </Link>
    );
};

export default LinkSlice;
