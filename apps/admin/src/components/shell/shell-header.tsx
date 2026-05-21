'use client';

import { Menu } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { AccountMenu, type AccountMenuUser } from '@/components/shell/account-menu';
import { CommandPalette, type CommandPaletteItem } from '@/components/shell/command-palette';
import { CommandPaletteTrigger } from '@/components/shell/command-palette-trigger';
import { MobileDrawer } from '@/components/shell/mobile-drawer';
import { ShopSwitcher, type ShopSwitcherShop } from '@/components/shell/shop-switcher';
import { useBreakpoint } from '@/components/shell/use-breakpoint';
import logo from '@/static/logo.svg';
import { cn } from '@/utils/tailwind';

export type ShellHeaderProps = {
    shop: ShopSwitcherShop;
    user: AccountMenuUser;
    shopsForSwitcher: ShopSwitcherShop[];
    commandPaletteItems: CommandPaletteItem[];
    /** Pre-rendered mobile nav content (server component children of MobileDrawer). Required for `<md` UX. */
    mobileNavContent: ReactNode;
};

export function ShellHeader({ shop, user, shopsForSwitcher, commandPaletteItems, mobileNavContent }: ShellHeaderProps) {
    return (
        <header
            className={cn(
                'flex h-14 w-full items-center justify-between gap-3 border-0 border-border border-b-2 bg-background px-3',
            )}
        >
            <div className="flex items-center gap-3">
                <div className="md:hidden">
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
                </div>
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
                <ShopSwitcher current={shop} shops={shopsForSwitcher} />
            </div>

            <div className="flex items-center gap-2">
                <CommandPaletteTrigger />
                <AccountMenu user={user} />
            </div>

            <CommandPalette items={commandPaletteItems} />
        </header>
    );
}
