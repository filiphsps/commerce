'use client';

import { components as menuSlices } from '@/slices/navigation';
import { cn } from '@/utils/tailwind';
import { SliceZone } from '@prismicio/react';
import { usePathname } from 'next/navigation';

import type { MenuDocumentData } from '@/prismic/types';
import type { HTMLProps } from 'react';

export const LINK_STYLES =
    'flex h-full cursor-pointer select-none flex-nowrap items-center justify-center text-nowrap border-0 border-b-2 border-t-2 border-solid border-transparent border-t-transparent bg-transparent py-4 md:py-3 font-medium leading-none text-gray-700 transition-all duration-150 *:duration-150 hover:underline focus:underline';

export const LINK_ACTIVE_MENU_STYLES = 'bg-gray-100 px-2 font-semibold text-black  -mx-2';
export const LINK_ACTIVE_STYLES = 'border-b-primary font-bold text-primary';

type HeaderNavigationProps = {
    slices: MenuDocumentData['slices'];
} & HTMLProps<HTMLDivElement>;
export const HeaderNavigation = ({ slices = [], className, ...props }: HeaderNavigationProps) => {
    const pathname = usePathname();

    return (
        <nav
            className={cn(
                'overflow-x-shadow flex w-full grow items-center justify-start gap-5 overflow-x-auto whitespace-nowrap px-2 md:max-w-[var(--page-width)] md:flex-row md:overflow-hidden md:px-3 lg:gap-6',
                className
            )}
            {...props}
        >
            <SliceZone slices={slices} components={menuSlices} context={{ isHeader: true, pathname }} />
        </nav>
    );
};
