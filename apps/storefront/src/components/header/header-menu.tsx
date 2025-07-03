'use client';

import { type HTMLProps } from 'react';

import { components as menuSlices } from '@/slices/navigation';
import { cn } from '@/utils/tailwind';
import { SliceZone } from '@prismicio/react';

import { useHeaderMenu } from '@/components/header/header-provider';

import type { MenuDocumentData } from '@/prismic/types';

export const SHARED_STYLES =
    'flex max-h-[calc(100dvh-10rem)] w-full flex-col items-center justify-start overflow-y-auto overscroll-contain border-0 border-b border-solid border-gray-300 bg-gray-100 group-data-[scrolled=true]/body:max-h-[calc(100dvh-7rem)] group-data-[menu-open=false]/body:overflow-y-hidden transition-all';

type HeaderMenuProps = {
    slices: MenuDocumentData['slices'];
} & HTMLProps<HTMLDivElement>;
export const HeaderMenu = ({ slices, children, className, ...props }: HeaderMenuProps) => {
    const { menu } = useHeaderMenu();
    if (!menu) {
        return <div className={cn(SHARED_STYLES, 'h-0 border-0', className)} {...props} />;
    }

    return (
        <div className={cn(SHARED_STYLES, className)} {...props}>
            <SliceZone slices={slices} components={menuSlices} context={{ isHeader: false, menu }} />

            {children as any}
        </div>
    );
};
