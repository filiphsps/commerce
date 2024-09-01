import { type ElementType, type HTMLProps, type ReactNode, Suspense } from 'react';

import { cn } from '@/utils/tailwind';

export type ContentProps = {
    children?: ReactNode;
    html?: string;
    as?: ElementType;
} & HTMLProps<HTMLDivElement>;
export const Content = ({ children, as, className, html, ...props }: ContentProps) => {
    const AsComponent = as || 'div';

    return (
        <Suspense>
            <AsComponent
                {...props}
                className={cn(
                    'prose prose-strong:font-extrabold prose-headings:text-inherit prose-a:text-inherit prose-a:no-underline prose-a:hover:underline text-current *:text-inherit empty:hidden',
                    className
                )}
                {...(html ? { dangerouslySetInnerHTML: { __html: html } } : { children })}
            />
        </Suspense>
    );
};
