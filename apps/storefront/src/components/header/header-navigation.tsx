import 'server-only';

import { resolveLink } from '@nordcom/commerce-cms/api';
import type { Header } from '@nordcom/commerce-cms/types';
import type { HTMLProps } from 'react';
import Link from '@/components/link';
import type { Locale } from '@/utils/locale';
import { cn } from '@/utils/tailwind';
import { HEADER_LINK_BUBBLE_STYLES, HEADER_LINK_STYLES, HeaderMenuTrigger } from './header-menu';

type NavItems = NonNullable<Header['items']>;
type NavItem = NavItems[number];

export type HeaderNavigationProps = {
    items: NavItems;
    locale: Locale;
} & Omit<HTMLProps<HTMLDivElement>, 'className' | 'children'>;

/**
 * Horizontally scrollable server-rendered top navigation bar.
 *
 * @param props.items - CMS nav items rendered as top-level links or menu triggers.
 * @param props.locale - Active locale forwarded to `HeaderMenuTrigger` and link resolvers.
 * @returns The `<nav>` element, or `null` when `items` is empty.
 */
export function HeaderNavigation({ items, locale, ...rest }: HeaderNavigationProps) {
    if (!items?.length) return null;

    return (
        <nav
            className={cn(
                'flex w-full grow items-center justify-start gap-x-header-trigger whitespace-nowrap px-2',
                'snap-x snap-proximity scroll-px-2',
                'max-md:overflow-x-auto max-md:overflow-y-clip',
                'max-md:[mask-image:linear-gradient(to_right,transparent_0,black_16px,black_calc(100%-16px),transparent_100%)]',
                'md:max-w-(--page-width) md:flex-row md:overflow-visible md:px-3',
                'md:[mask-image:none]',
            )}
            {...rest}
        >
            {items.map((item, i) => (
                <HeaderNavTopItem key={`nav-${item.id || i}`} item={item} locale={locale} />
            ))}
        </nav>
    );
}

HeaderNavigation.displayName = 'Nordcom.Header.HeaderNavigation';

/**
 * Single top-level nav entry that renders as a `HeaderMenuTrigger` when it has children, or a plain link otherwise.
 *
 * @param props.item - CMS nav item providing link, children, and metadata.
 * @param props.locale - Active locale forwarded to link resolvers.
 * @returns The trigger or anchor element, or `null` when the item has no link.
 */
function HeaderNavTopItem({ item, locale }: { item: NavItem; locale: Locale }) {
    const link = item.link;
    if (!link) return null;

    const hasChildren = Array.isArray(item.items) && item.items.length > 0;
    const href = resolveLink(link as never, { locale: { code: locale.code } });

    if (hasChildren) {
        return <HeaderMenuTrigger item={item} locale={{ code: locale.code }} />;
    }

    return (
        <Link
            href={href || '/'}
            target={link.openInNewTab ? '_blank' : undefined}
            className={cn(HEADER_LINK_STYLES, 'snap-start text-base text-inherit')}
        >
            <span className={cn(HEADER_LINK_BUBBLE_STYLES)}>{link.label}</span>
        </Link>
    );
}
