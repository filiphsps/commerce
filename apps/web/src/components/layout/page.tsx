import styles from '@/components/layout/page.module.scss';
import type { HTMLProps, ReactNode } from 'react';

export type PageProps = {
    children: ReactNode;
} & HTMLProps<HTMLDivElement>;
export const Page = ({ className, children, ...props }: PageProps) => {
    return (
        <main {...props} className={`${styles.container} ${className || ''}`}>
            {children}
        </main>
    );
};
