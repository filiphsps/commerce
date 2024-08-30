import styles from '@/components/page-content.module.scss';

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
                styles.container,
                'mx-auto flex w-full max-w-[var(--page-width)] flex-col gap-2 text-base empty:hidden md:gap-4',
                primary && styles.primary,
                primary && 'gap-4 p-2 md:p-3',
                className
            )}
        />
    );
};

PageContent.displayName = 'Nordcom.PageContent';
export default PageContent;
