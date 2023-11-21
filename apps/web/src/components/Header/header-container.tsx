import type { HTMLProps, ReactNode } from 'react';

import styles from '@/components/Header/header.module.scss';

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
