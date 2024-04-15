import styles from '@/components/header/header.module.scss';

import type { HTMLProps, ReactNode } from 'react';

type HeaderContainerProps = {
    children?: ReactNode;
} & HTMLProps<HTMLDivElement>;
export const HeaderContainer = ({ className, children, ...props }: HeaderContainerProps) => {
    return (
        <header {...props} className={`${styles.container} ${className || ''}`}>
            <div className={styles.content}>{children}</div>
        </header>
    );
};
