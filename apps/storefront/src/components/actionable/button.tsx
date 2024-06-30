import styles from '@/components/actionable/button.module.scss';

import type { As } from '@nordcom/nordstar';

import { cn } from '@/utils/tailwind';

import type { ComponentProps, ReactNode } from 'react';

export type ButtonProps<T extends As> = {
    as?: As;

    children: ReactNode;
} & ComponentProps<T>;
export const Button = <T extends As>({ as: Tag = 'button' as T, children, className, ...props }: ButtonProps<T>) => {
    return (
        <Tag draggable={false} {...props} className={cn(styles.container, className)}>
            {children}
        </Tag>
    );
};
