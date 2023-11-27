import styles from '#/components/content.module.scss';
import type { ComponentProps, ElementType, ReactNode } from 'react';

export type ContentProps<T extends ElementType = 'article'> = {
    children?: ReactNode;
    as?: T;
} & Omit<ComponentProps<T>, 'as' | 'className'>;
export const Content = <T extends ElementType = 'article'>({ children, as, ...props }: ContentProps<T>) => {
    const AsComponent: ElementType = (as || 'article') as any;

    return (
        <AsComponent {...props} className={styles.container}>
            {children || null}
        </AsComponent>
    );
};
