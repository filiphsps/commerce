import styles from '@/components/actionable/button.module.scss';
import type { ComponentProps, ElementType, ReactNode } from 'react';

export type ButtonProps<T extends ElementType = 'button'> = {
    children: ReactNode;
    as?: T;
} & Omit<ComponentProps<T>, 'as'>;

export const Button = <T extends ElementType = 'button'>({ children, as, className, ...props }: ButtonProps<T>) => {
    const AsComponent: ElementType = (as || 'button') as any;

    return (
        <AsComponent {...props} draggable={false} className={`${styles.container} ${className || ''}`}>
            {children}
        </AsComponent>
    );
};
