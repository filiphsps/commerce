import styles from '@/components/page-content.module.scss';

import type { HTMLProps, ReactNode } from 'react';

export type PageContentProps = {
    primary?: boolean;
    children?: ReactNode;
} & HTMLProps<HTMLDivElement>;
const PageContent = ({ primary, className, ...props }: PageContentProps) => {
    return <div {...props} className={`${styles.container} ${primary ? styles.primary : ''} ${className || ''}`} />;
};

export default PageContent;
