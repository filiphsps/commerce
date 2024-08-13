import styles from '@/components/actionable/button.module.scss';

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
            className={cn(styled && styles.container, styled && 'max-h-full hover:shadow-lg', className)}
            suppressHydrationWarning={true}
        >
            {children}
        </Tag>
    );
};
