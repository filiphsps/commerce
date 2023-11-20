import styles from '@/components/Page/page.module.scss';
import type { HTMLProps, ReactNode } from 'react';

export type PageProps = {
    children: ReactNode;
} & HTMLProps<HTMLDivElement>;
const Page = ({ className, children, ...props }: PageProps) => {
    return (
        <main {...props} className={`${styles.container} ${className || ''}`}>
            {children}
        </main>
    );
};

export default Page;
