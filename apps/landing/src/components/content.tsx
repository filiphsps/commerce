import styles from '@/components/content.module.scss';

import type { ComponentProps, ElementType, ReactNode } from 'react';

export type ContentProps<T extends ElementType = 'article'> = {
    children?: ReactNode;
    as?: T;
} & Omit<ComponentProps<T>, 'as'>;
export const Content = <T extends ElementType = 'article'>({ children, as, className, ...props }: ContentProps<T>) => {
    const AsComponent: ElementType = (as || 'article') as any;

    return (
        <AsComponent {...props} className={`${styles.container} ${className || ''}`}>
            {children || null}
        </AsComponent>
    );
};
