'use client';

import type { Header } from '@nordcom/commerce-cms/types';

type NavItem = NonNullable<Header['items']>[number];

/** Placeholder — Task 11 replaces this with the real mega-menu trigger. */
export function HeaderMenuTrigger({ item }: { item: NavItem; locale: { code: string } }) {
    return <button type="button">{item.link?.label}</button>;
}

/** Legacy export kept as a no-op for source compat. Removed in Task 11. */
export function HeaderMenu() {
    return null;
}
