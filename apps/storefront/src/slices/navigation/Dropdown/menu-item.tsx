'use client';

import { FiChevronDown } from 'react-icons/fi';

import { cn } from '@/utils/tailwind';
import { type Content } from '@prismicio/client';

import { LINK_ACTIVE_MENU_STYLES, LINK_STYLES } from '@/components/header/header-navigation';
import { useHeaderMenu } from '@/components/header/header-provider';
import { PrismicText } from '@/components/typography/prismic-text';

import type { SliceComponentProps } from '@prismicio/react';

type DropdownMenuItemProps = Pick<SliceComponentProps<Content.DropdownSlice>, 'slice'>;
export const DropdownMenuItem = ({ slice }: DropdownMenuItemProps) => {
    const { setMenu, menu, closeMenu } = useHeaderMenu();
    const activeMenu = menu === slice.id;

    return (
        <button
            className={cn(LINK_STYLES, 'flex items-center gap-1', activeMenu && LINK_ACTIVE_MENU_STYLES)}
            onClick={() => {
                if (activeMenu) return closeMenu();
                return setMenu(slice.id);
            }}
            data-menu-target={slice.id}
            key={slice.id}
        >
            <PrismicText data={slice.primary.title} styled={false} bare={true} />

            <FiChevronDown className={cn('text-inherit', activeMenu && 'rotate-180')} style={{ strokeWidth: 3 }} />
        </button>
    );
};
