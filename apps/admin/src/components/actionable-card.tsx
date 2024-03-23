import styles from './actionable-card.module.scss';

import { Card } from '@nordcom/nordstar';

import type { HTMLProps, ReactNode } from 'react';

export type ActionableCardProps = {
    header?: ReactNode | ReactNode[];
    headerAction?: ReactNode;
    actions?: ReactNode | ReactNode[] | null;
    footer?: ReactNode | ReactNode[];
    children?: ReactNode | ReactNode[];
} & Omit<HTMLProps<HTMLDivElement>, 'children'>;
export default function ActionableCard({
    header,
    headerAction,
    actions,
    footer,
    children,
    className
}: ActionableCardProps) {
    return (
        <Card className={`${styles.container} ${className || ''}`}>
            {header ? (
                <>
                    <header className={`${styles.block} ${styles.header}`}>
                        <section className={styles.title}>{header}</section>
                        {headerAction ? <section className={styles.action}>{headerAction}</section> : null}
                    </header>

                    <Card.Divider className={styles.divider} />
                </>
            ) : null}

            <main className={`${styles.block} ${styles.content}`}>{children}</main>

            {actions ? (
                <>
                    <Card.Divider className={styles.divider} />

                    <nav className={`${styles.block} ${styles.actions}`}>{actions}</nav>
                </>
            ) : null}

            {footer ? (
                <>
                    <Card.Divider className={styles.divider} />

                    <footer className={`${styles.block} ${styles.footer}`}>{footer}</footer>
                </>
            ) : null}
        </Card>
    );
}
