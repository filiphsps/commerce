import * as React from 'react';

import { cn } from '@/utils/tailwind';
import { cva } from 'class-variance-authority';

import type { VariantProps } from 'class-variance-authority';
import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';

const buttonVariants = cva(
    'inline-flex items-center justify-center whitespace-nowrap rounded-md text-base leading-none ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed font-bold uppercase px-3 h-11 appearance-none',
    {
        variants: {
            variant: {
                default: 'bg-primary text-primary-foreground hover:brightness-50 font-extrabold',
                secondary: 'bg-foreground text-background hover:brightness-50',
                outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
                ghost: 'hover:bg-accent hover:text-accent-foreground',
                link: 'text-primary underline-offset-4 hover:underline'
            }
        },
        defaultVariants: {
            variant: 'default'
        }
    }
);

export type ButtonPropsBase<ComponentGeneric extends ElementType> = {
    as?: ComponentGeneric;
    children?: ReactNode;
    className?: string;
    disabled?: boolean;
} & VariantProps<typeof buttonVariants>;

export type ButtonProps<ComponentGeneric extends ElementType> = ButtonPropsBase<ComponentGeneric> &
    (ComponentGeneric extends keyof React.JSX.IntrinsicElements
        ? Omit<ComponentPropsWithoutRef<ComponentGeneric>, keyof ButtonPropsBase<ComponentGeneric>>
        : ComponentPropsWithoutRef<ComponentGeneric>);

export const Button = <ComponentGeneric extends ElementType = 'button'>({
    as,
    variant,
    className,
    ...props
}: ButtonProps<ComponentGeneric>): JSX.Element => {
    const Tag = as ?? 'button';

    return (
        <Tag
            {...props}
            className={cn(buttonVariants({ variant, className }))}
            draggable={false}
            suppressHydrationWarning={true}
            data-nosnippet={true}
        />
    );
};
Button.displayName = 'Nordcom.Actionable.Button';
