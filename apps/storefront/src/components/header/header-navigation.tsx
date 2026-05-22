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

export function HeaderNavigation({ items, locale, ...rest }: HeaderNavigationProps) {
    if (!items?.length) return null;

    return (
        <nav
            className={cn(
                'flex w-full grow items-center justify-start gap-x-header-trigger whitespace-nowrap px-2 max-md:overflow-x-auto max-md:overflow-y-clip md:max-w-(--page-width) md:flex-row md:px-3',
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
            className={cn(HEADER_LINK_STYLES, 'text-base text-inherit')}
        >
            <span className={cn(HEADER_LINK_BUBBLE_STYLES)}>{link.label}</span>
        </Link>
    );
}
