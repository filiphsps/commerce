import { type ElementType, type ReactNode } from 'react';

import { cn } from '@/utils/tailwind';

import type { ComponentPropsWithoutRef } from 'react';

export type ContentPropsBase<ComponentGeneric extends ElementType> = {
    as?: ComponentGeneric;
    className?: string;
    children?: ReactNode;
    html?: string | null;
};

export type ContentProps<ComponentGeneric extends ElementType> = ContentPropsBase<ComponentGeneric> &
    (ComponentGeneric extends keyof React.JSX.IntrinsicElements
        ? Omit<ComponentPropsWithoutRef<ComponentGeneric>, keyof ContentPropsBase<ComponentGeneric>>
        : ComponentPropsWithoutRef<ComponentGeneric>);

export const Content = <ComponentGeneric extends ElementType = 'div'>({
    as,
    className,
    html,
    children,
    ...props
}: ContentProps<ComponentGeneric>) => {
    if (!html && !children && !as) {
        return null;
    }

    const AsComponent = as || 'div';

    return (
        <AsComponent
            {...props}
            className={cn(
                'prose prose-strong:font-extrabold prose-headings:text-inherit prose-a:text-inherit prose-a:no-underline prose-headings:text-pretty text-current *:text-inherit empty:hidden',
                className
            )}
            {...(html ? { dangerouslySetInnerHTML: { __html: html } } : { children })}
        />
    );
};
