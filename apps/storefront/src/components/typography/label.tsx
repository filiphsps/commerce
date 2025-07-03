import { cn } from '@/utils/tailwind';

import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';

export type LabelPropsBase<ComponentGeneric extends ElementType> = {
    as?: ComponentGeneric;
    styled?: boolean;
    children?: ReactNode;
    className?: string;
    disabled?: boolean;
};

export type LabelProps<ComponentGeneric extends ElementType> = LabelPropsBase<ComponentGeneric> &
    (ComponentGeneric extends keyof React.JSX.IntrinsicElements
        ? Omit<ComponentPropsWithoutRef<ComponentGeneric>, keyof LabelPropsBase<ComponentGeneric>>
        : ComponentPropsWithoutRef<ComponentGeneric>);

export const Label = <ComponentGeneric extends ElementType = 'p'>({
    children,
    as,
    className,
    ...props
}: LabelProps<ComponentGeneric>) => {
    if (!children) {
        return null;
    }

    const Tag = as ?? 'p';

    return (
        <Tag {...props} className={cn('block text-sm font-extrabold uppercase leading-tight', className)}>
            {children as any}
        </Tag>
    );
};
