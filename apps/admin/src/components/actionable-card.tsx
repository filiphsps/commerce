import styles from '@/components/actionable-card.module.scss';
import { Card } from '@nordcom/nordstar';

import type { HTMLProps, ReactNode } from 'react';

export type ActionableCardProps = {
    header?: ReactNode | ReactNode[];
    children?: ReactNode | ReactNode[];
    footer?: ReactNode | ReactNode[];
} & Omit<HTMLProps<HTMLDivElement>, 'children'>;
export default function ActionableCard({ header, children, footer, className }: ActionableCardProps) {
    return (
        <Card className={`${styles.container} ${className || ''}`} as="section">
            {header ? (
                <header className={styles.header}>
                    {header}

                    {children ? <hr /> : null}
                </header>
            ) : null}

            {children ? <main className={styles.header}>{children}</main> : null}

            {footer ? (
                <footer className={styles.footer}>
                    <hr />

                    {footer}
                </footer>
            ) : null}
        </Card>
    );
}
