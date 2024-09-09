import { type HTMLProps, type ReactNode } from 'react';

import { cn } from '@/utils/tailwind';

import type { ElementType } from 'react';

export type PageContentProps = {
    as?: ElementType;
    primary?: boolean;
    children?: ReactNode;
} & HTMLProps<HTMLDivElement>;
const PageContent = ({ as: Tag = 'div', primary, className, ...props }: PageContentProps) => {
    if (!props.children) {
        return null;
    }

    return (
        <Tag
            {...props}
            className={cn(
                'mx-auto flex w-screen max-w-full flex-col gap-2 text-base empty:hidden md:w-[var(--page-width)] md:gap-4',
                primary && 'min-h-[calc(100vh-10rem)] gap-8 p-2 [grid-area:content] md:gap-12 md:p-3',
                className
            )}
        />
    );
};

PageContent.displayName = 'Nordcom.PageContent';
export default PageContent;
