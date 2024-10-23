'use client';

import { LINK_ACTIVE_MENU_STYLES, LINK_BUBBLE_STYLES, LINK_STYLES } from '@/slices/navigation/Link';
import { cn } from '@/utils/tailwind';
import { asText, type Content } from '@prismicio/client';
import { ChevronDown as ChevronDownIcon } from 'lucide-react';

import { useHeaderMenu } from '@/components/header/header-provider';
import { PrismicText } from '@/components/typography/prismic-text';

import type { SliceComponentProps } from '@prismicio/react';

export type DropdownMenuItemProps = Pick<SliceComponentProps<Content.DropdownSlice>, 'slice'>;

export function DropdownMenuItem({ slice }: DropdownMenuItemProps) {
    const { setMenu, menu, closeMenu } = useHeaderMenu();
    const activeMenu = menu === slice.id;

    return (
        <button
            type="button"
            title={asText(slice.primary.title)}
            className={cn(LINK_STYLES, activeMenu && LINK_ACTIVE_MENU_STYLES, activeMenu && 'text-black')}
            onClick={() => {
                if (activeMenu) {
                    return closeMenu();
                }

                return setMenu(slice.id);
            }}
            data-menu-target={slice.id}
            key={slice.id}
        >
            <div className={cn(LINK_BUBBLE_STYLES, 'flex items-center gap-1')}>
                <PrismicText data={slice.primary.title} styled={false} bare={true} />

                <ChevronDownIcon
                    className={cn('stroke-1 text-inherit transition-transform', activeMenu && 'rotate-180')}
                />
            </div>
        </button>
    );
}
