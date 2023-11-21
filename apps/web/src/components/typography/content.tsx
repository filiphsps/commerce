import styles from '@/components/typography/content.module.scss';
import type { ElementType, HTMLProps, ReactNode } from 'react';

export type LabelProps = {
    children?: ReactNode;
    as?: ElementType;
} & HTMLProps<HTMLDivElement>;
export const Content = ({ children, as, className, ...props }: LabelProps) => {
    const AsComponent = as || 'div';

    return (
        <AsComponent {...props} className={`${styles.container} ${className || ''}`}>
            {children}
        </AsComponent>
    );
};
