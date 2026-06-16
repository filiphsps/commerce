'use client';

import { OrganizationSwitcher } from '@clerk/nextjs';
import { Menu } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { AccountMenu } from '@/components/shell/account-menu';
import { CommandPalette, type CommandPaletteItem } from '@/components/shell/command-palette';
import { CommandPaletteTrigger } from '@/components/shell/command-palette-trigger';
import { MobileDrawer } from '@/components/shell/mobile-drawer';
import { SectionCrumb, type SectionCrumbSection } from '@/components/shell/section-crumb';
import { ShopSwitcher, type ShopSwitcherShop } from '@/components/shell/shop-switcher';
import { useBreakpoint } from '@/components/shell/use-breakpoint';
import { clerkAppearance } from '@/lib/clerk-appearance';
import logo from '@/static/logo.svg';
import { cn } from '@/utils/tailwind';

export type ShellHeaderProps = {
    shop: ShopSwitcherShop;
    shopsForSwitcher: ShopSwitcherShop[];
    commandPaletteItems: CommandPaletteItem[];
    /** Top-level nav sections used to derive the contextual crumb beside the shop switcher. */
    navSections: SectionCrumbSection[];
    /** Pre-rendered mobile nav content (server component children of MobileDrawer). Required for `<md` UX. */
    mobileNavContent: ReactNode;
};

/**
 * Top application bar for the admin shell containing the logo, the Clerk organization switcher, the
 * shop switcher, the search trigger, and the account menu.
 *
 * The {@link OrganizationSwitcher} selects the active Clerk ORG (the tenant team that owns shops);
 * `hidePersonal` keeps a personal account out of the list since every shop is org-owned. Selecting an
 * org returns to the chooser (`/`) — the storefront WITHIN an org is still chosen via the `/[domain]/`
 * route — and creating one routes to `/onboarding`. The {@link AccountMenu} (Clerk `<UserButton>`)
 * self-sources the operator from the Clerk session, so the header no longer threads a `user` prop.
 *
 * On compact breakpoints the desktop sidebar is replaced by a MobileDrawer triggered from this header.
 * The breakpoint gate is client-side to avoid a Radix useId hydration mismatch on the trigger button.
 *
 * @param props.shop - The currently active shop for the shop switcher.
 * @param props.shopsForSwitcher - All shops available for switching.
 * @param props.commandPaletteItems - Items rendered in the CommandPalette opened by the search trigger.
 * @param props.navSections - Top-level nav sections for the contextual crumb beside the shop switcher.
 * @param props.mobileNavContent - Pre-rendered server component tree rendered inside the MobileDrawer.
 */
export function ShellHeader({
    shop,
    shopsForSwitcher,
    commandPaletteItems,
    navSections,
    mobileNavContent,
}: ShellHeaderProps) {
    // Gate the mobile drawer on the real breakpoint instead of `md:hidden`.
    // SSR + first-client-render both see the default 'comfortable' breakpoint,
    // so MobileDrawer is absent from the hydrated DOM — only mounted after
    // useBreakpoint's effect kicks in. This avoids a Radix `useId` hydration
    // mismatch on the trigger button (server's aria-controls drifted from the
    // client's because divergent client-only state further down the tree
    // shifted Radix's useId position).
    const breakpoint = useBreakpoint();
    const isCompact = breakpoint === 'mobile' || breakpoint === 'tablet';

    return (
        <header
            className={cn(
                'flex h-14 w-full items-center justify-between gap-3 border-0 border-border border-b-2 bg-background px-3',
            )}
        >
            <div className="flex items-center gap-3">
                {isCompact ? (
                    <MobileDrawer
                        side="left"
                        title="Navigate"
                        trigger={
                            <button
                                type="button"
                                aria-label="Open menu"
                                className="flex h-9 w-9 items-center justify-center rounded-md border-2 border-border"
                            >
                                <Menu className="h-5 w-5" />
                            </button>
                        }
                    >
                        {mobileNavContent}
                    </MobileDrawer>
                ) : null}
                <Link href="/" title="Nordcom Commerce" className="flex shrink-0 items-center">
                    <Image
                        className="h-7 w-auto object-contain object-left"
                        src={logo}
                        alt="Nordcom Commerce Logo"
                        height={75}
                        width={150}
                        priority
                    />
                </Link>
                <OrganizationSwitcher
                    appearance={clerkAppearance}
                    hidePersonal
                    afterSelectOrganizationUrl="/"
                    afterCreateOrganizationUrl="/onboarding/"
                />
                <ShopSwitcher current={shop} shops={shopsForSwitcher} />
                <SectionCrumb sections={navSections} />
            </div>

            <div className="flex items-center gap-2">
                <CommandPaletteTrigger />
                <AccountMenu />
            </div>

            <CommandPalette items={commandPaletteItems} />
        </header>
    );
}
