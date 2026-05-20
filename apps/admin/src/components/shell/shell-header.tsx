import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { AccountMenu, type AccountMenuUser } from '@/components/shell/account-menu';
import { CommandPalette, type CommandPaletteItem } from '@/components/shell/command-palette';
import { CommandPaletteTrigger } from '@/components/shell/command-palette-trigger';
import { ShopSwitcher, type ShopSwitcherShop } from '@/components/shell/shop-switcher';
import logo from '@/static/logo.svg';
import { cn } from '@/utils/tailwind';

export type ShellHeaderProps = {
    shop: ShopSwitcherShop;
    user: AccountMenuUser;
    shopsForSwitcher: ShopSwitcherShop[];
    commandPaletteItems: CommandPaletteItem[];
    /** Trigger for the mobile drawer; provided by ShellRoot. Rendered only `<md`. */
    mobileMenuTrigger?: ReactNode;
};

export function ShellHeader({
    shop,
    user,
    shopsForSwitcher,
    commandPaletteItems,
    mobileMenuTrigger,
}: ShellHeaderProps) {
    return (
        <header
            className={cn(
                'flex h-14 w-full items-center justify-between gap-3 border-0 border-border border-b-2 bg-background px-3',
            )}
        >
            <div className="flex items-center gap-3">
                <div className="md:hidden">{mobileMenuTrigger}</div>
                <Link href="/" title="Nordcom Commerce" className="flex shrink-0 items-center">
                    <Image
                        className="h-7 object-contain object-left"
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
