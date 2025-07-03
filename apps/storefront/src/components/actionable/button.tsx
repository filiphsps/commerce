import { cn } from '@/utils/tailwind';

import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';

export type ButtonPropsBase<ComponentGeneric extends ElementType> = {
    as?: ComponentGeneric;
    styled?: boolean;
    children?: ReactNode;
    className?: string;
    disabled?: boolean;
};

export type ButtonProps<ComponentGeneric extends ElementType> = ButtonPropsBase<ComponentGeneric> &
    (ComponentGeneric extends keyof React.JSX.IntrinsicElements
        ? Omit<ComponentPropsWithoutRef<ComponentGeneric>, keyof ButtonPropsBase<ComponentGeneric>>
        : ComponentPropsWithoutRef<ComponentGeneric>);

export const Button = <ComponentGeneric extends ElementType = 'button'>({
    as,
    styled = true,
    className,
    ...props
}: ButtonProps<ComponentGeneric>) => {
    const Tag = as ?? 'button';

    return (
        <Tag
            {...props}
            className={cn(
                'transition-color appearance-none duration-150',
                styled &&
                    'bg-primary text-primary-foreground inline-flex max-h-full cursor-pointer select-none items-center justify-center gap-1 rounded-xl px-3 py-2 text-base font-semibold leading-none transition-all duration-150 *:text-inherit disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500 disabled:shadow-none disabled:brightness-100 data-[success=true]:bg-green-600 data-[success=true]:text-white',
                !props.disabled &&
                    styled &&
                    'drop-shadow focus-within:brightness-75 hover:shadow-lg hover:brightness-75 active:brightness-75',
                props.disabled && 'pointer-events-none cursor-not-allowed shadow-none',
                className
            )}
            draggable={false}
            suppressHydrationWarning={true}
            data-nosnippet={true}
        />
    );
};
Button.displayName = 'Nordcom.Actionable.Button';
