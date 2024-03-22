import styles from '@/components/page-content.module.scss';

import { type HTMLProps, type ReactNode } from 'react';

import type { As } from '@nordcom/nordstar';

export type PageContentProps = {
    as?: As;
    primary?: boolean;
    children?: ReactNode;
} & HTMLProps<HTMLDivElement>;
const PageContent = ({ as: Tag = 'div', primary, className, ...props }: PageContentProps) => {
    return <Tag {...props} className={`${styles.container} ${primary ? styles.primary : ''} ${className || ''}`} />;
};

PageContent.displayName = 'Nordcom.PageContent';
export default PageContent;
