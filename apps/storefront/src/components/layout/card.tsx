import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';
import { cn } from '@/utils/tailwind';

export type CardPropsBase<ComponentGeneric extends ElementType> = {
    as?: ComponentGeneric;
    className?: string;
    children?: ReactNode;

    border?: boolean;
};

export type CardProps<ComponentGeneric extends ElementType> = CardPropsBase<ComponentGeneric> &
    (ComponentGeneric extends keyof React.JSX.IntrinsicElements
        ? Omit<ComponentPropsWithoutRef<ComponentGeneric>, keyof CardPropsBase<ComponentGeneric>>
        : ComponentPropsWithoutRef<ComponentGeneric>);

export const Card = <ComponentGeneric extends ElementType = 'div'>({
    as,
    className,
    children,

    border = false,
}: CardProps<ComponentGeneric>) => {
    const Tag = as ?? 'div';

    return (
        <Tag
            className={cn(
                'rounded-lg border border-gray-200 border-solid p-3',
                !border && 'bg-gray-100',
                border && 'border-2 border-gray-100 border-solid',
                className,
            )}
        >
            {children}
        </Tag>
    );
};
Card.displayName = 'Nordcom.Layout.Card';
