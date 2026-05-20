import 'server-only';

import { resolveLink } from '@nordcom/commerce-cms/api';
import type { Header } from '@nordcom/commerce-cms/types';
import type { HTMLProps } from 'react';
import Link from '@/components/link';
import type { Locale } from '@/utils/locale';
import { cn } from '@/utils/tailwind';
import { HeaderMenuTrigger } from './header-menu';

type NavItems = NonNullable<Header['items']>;
type NavItem = NavItems[number];

export type HeaderNavigationProps = {
    items: NavItems;
    locale: Locale;
} & Omit<HTMLProps<HTMLDivElement>, 'className' | 'children'>;

export function HeaderNavigation({ items, locale, ...rest }: HeaderNavigationProps) {
    if (!items || items.length === 0) return null;

    return (
        <nav
            className={cn(
                'overflow-x-shadow flex w-full grow items-center justify-start gap-5 overflow-x-auto overflow-y-clip whitespace-nowrap px-2 md:max-w-[var(--page-width)] md:flex-row md:overflow-hidden md:px-3 lg:gap-6',
            )}
            {...rest}
        >
            {items.map((item, i) => (
                <HeaderNavTopItem key={item.id ?? `nav-${i}`} item={item} locale={locale} />
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
        return <HeaderMenuTrigger item={item} locale={locale} />;
    }

    return (
        <Link
            href={href || '/'}
            target={link.openInNewTab ? '_blank' : undefined}
            className="font-medium text-base leading-none hover:text-primary focus-visible:text-primary"
        >
            {link.label}
        </Link>
    );
}
