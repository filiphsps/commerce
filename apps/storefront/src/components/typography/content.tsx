import { type ElementType, type HTMLProps, type ReactNode, Suspense } from 'react';

import { cn } from '@/utils/tailwind';

export type ContentProps = {
    children?: ReactNode;
    as?: ElementType;
} & HTMLProps<HTMLDivElement>;
export const Content = ({ children, as, className, ...props }: ContentProps) => {
    const AsComponent = as || 'div';

    return (
        <AsComponent
            {...props}
            className={cn(
                'prose prose-strong:font-extrabold prose-headings:text-inherit prose-a:text-inherit prose-a:no-underline prose-a:hover:underline text-current *:text-inherit empty:hidden',
                className
            )}
        >
            <Suspense>{children}</Suspense>
        </AsComponent>
    );
};
