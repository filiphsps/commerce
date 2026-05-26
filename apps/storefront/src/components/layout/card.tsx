import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';
import { cn } from '@/utils/tailwind';

export type CardChrome = 'boxed' | 'frameless';

export type CardPropsBase<ComponentGeneric extends ElementType> = {
    as?: ComponentGeneric;
    className?: string;
    children?: ReactNode;

    border?: boolean;
    chrome?: CardChrome;
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
    chrome = 'boxed',
    ...rest
}: CardProps<ComponentGeneric>) => {
    const Tag = as ?? 'div';

    return (
        <Tag
            {...rest}
            className={cn(
                chrome === 'boxed' && [
                    'rounded-lg border border-gray-200 border-solid p-3',
                    !border && 'bg-gray-100',
                    border && 'border-2 border-gray-100 border-solid',
                ],
                chrome === 'frameless' && 'border-0 bg-transparent p-0',
                className,
            )}
        >
            {children}
        </Tag>
    );
};
Card.displayName = 'Nordcom.Layout.Card';
