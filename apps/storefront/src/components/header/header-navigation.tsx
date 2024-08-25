'use client';

import styles from '@/styles/horizontal-overflow-scroll.module.scss';

import { components as menuSlices } from '@/slices/navigation';
import { cn } from '@/utils/tailwind';
import { SliceZone } from '@prismicio/react';
import { usePathname } from 'next/navigation';

import type { MenuDocumentData } from '@/prismic/types';
import type { HTMLProps } from 'react';

export const LINK_STYLES =
    'flex h-full cursor-pointer select-none flex-nowrap items-center justify-center text-nowrap border-0 border-b-2 border-t-2 border-solid border-transparent border-t-transparent bg-transparent py-4 md:py-3 font-medium leading-none text-gray-800 transition-all duration-150 *:duration-150 hover:underline md:px-1';

export const LINK_ACTIVE_MENU_STYLES = 'bg-gray-100 px-2 font-semibold text-black md:px-2 -mx-2 md:-mx-1';
export const LINK_ACTIVE_STYLES = 'border-b-primary font-bold text-primary';

type HeaderNavigationProps = {
    slices: MenuDocumentData['slices'];
} & HTMLProps<HTMLDivElement>;
export const HeaderNavigation = ({ slices = [], className, ...props }: HeaderNavigationProps) => {
    const pathname = usePathname();

    return (
        <nav
            className={cn(
                'flex w-full grow items-center justify-start gap-5 overflow-x-auto px-3 md:max-w-[var(--page-width)] md:flex-row md:overflow-hidden md:px-1 lg:gap-6 lg:px-3',
                styles.container,
                className
            )}
            {...props}
        >
            <SliceZone slices={slices} components={menuSlices} context={{ isHeader: true, pathname }} />
        </nav>
    );
};
