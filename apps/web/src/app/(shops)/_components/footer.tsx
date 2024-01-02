import styles from '#/components/footer.module.scss';
import Link from 'next/link';
import type { HTMLProps } from 'react';

export type FooterProps = {} & Omit<HTMLProps<HTMLDivElement>, 'children'>;
export default function Footer({ className, ...props }: FooterProps) {
    return (
        <footer {...props} className={`${styles.footer} ${className || ''}`}>
            <div className={styles.container}>
                <div className={styles.content}>
                    <div className={`${styles.blocks} ${styles.beside}`}></div>

                    <div className={`${styles.status} ${styles.beside}`}>
                        <section className={styles.section}>
                            <iframe
                                title="Nordcom Status"
                                src="https://status.nordcom.io/badge?theme=dark"
                                width="auto"
                                height="30"
                                frameBorder="0"
                                scrolling="no"
                                className={styles['status-iframe']}
                            />
                        </section>
                        <section className={styles.section}>
                            <Link href="/changelog/" prefetch={false} className={styles['git-ref']}>
                                {(process.env.GIT_COMMIT_SHA || '').slice(0, 7)}
                            </Link>
                        </section>
                    </div>
                </div>
            </div>

            <div className={`${styles.copyrights}`}>
                <div className={`${styles.content} ${styles.beside}`}>
                    <section className={`${styles.section} ${styles.links}`}>
                        <div>
                            <Link href="https://nordcom.io/legal/terms-of-service/" prefetch={false}>
                                Terms of Service
                            </Link>
                        </div>
                        <div>
                            <Link href="https://nordcom.io/legal/privacy-policy/" prefetch={false}>
                                Privacy Policy
                            </Link>
                        </div>
                    </section>
                    <section className={styles.section}>
                        <div>
                            <Link href="https://nordcom.io/">
                                &copy; 2023-{new Date().getFullYear()} Nordcom Group Inc.
                            </Link>
                        </div>
                    </section>
                </div>
            </div>
        </footer>
    );
}
