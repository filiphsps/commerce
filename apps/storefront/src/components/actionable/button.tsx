import type { As } from '@nordcom/nordstar';

import { cn } from '@/utils/tailwind';

import type { ComponentProps, ReactNode } from 'react';

export type ButtonProps<T extends As> = {
    as?: As;
    children: ReactNode;
    styled?: boolean;
} & ComponentProps<T>;
export const Button = <T extends As>({
    as: Tag = 'button' as T,
    styled = true,
    children,
    className,
    ...props
}: ButtonProps<T>) => {
    return (
        <Tag
            draggable={false}
            {...props}
            className={cn(
                styled &&
                    'bg-primary text-primary-foreground inline-flex max-h-full cursor-pointer select-none appearance-none items-center justify-center gap-1 rounded-2xl px-4 py-2 text-sm font-semibold leading-tight transition-all duration-150 *:text-inherit hover:shadow-lg hover:brightness-75 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500 disabled:shadow-none disabled:brightness-100 data-[success=true]:bg-green-600 data-[success=true]:text-white',
                className
            )}
        >
            {children}
        </Tag>
    );
};
