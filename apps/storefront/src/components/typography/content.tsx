import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';
import { cn } from '@/utils/tailwind';

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
                'prose prose-headings:text-pretty prose-strong:font-extrabold prose-a:text-inherit prose-headings:text-inherit text-current prose-a:no-underline *:text-inherit empty:hidden',
                className,
            )}
            {...(html ? { dangerouslySetInnerHTML: { __html: html } } : { children })}
        />
    );
};
