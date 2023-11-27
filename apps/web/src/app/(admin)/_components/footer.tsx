import styles from '#/components/footer.module.scss';
import { Heading } from '@nordcom/nordstar';
import Link from 'next/link';
import type { HTMLProps } from 'react';

export type FooterProps = {} & Omit<HTMLProps<HTMLDivElement>, 'children'>;
export default function Footer({ className, ...props }: FooterProps) {
    return (
        <>
            <footer {...props} className={`${className || ''}`}>
                <div className={styles.container}>
                    <div className={styles.content}>
                        <div className={`${styles.blocks} ${styles.beside}`}></div>

                        <div className={`${styles.status} ${styles.beside}`}>
                            <section className={styles.section}>
                                <div className={styles.indicator}></div>
                                <Heading level="h4" as="div" className={styles.message}>
                                    All Services Operational
                                </Heading>
                            </section>
                            <section className={styles.section}>
                                <Link href="https://status.nordcom.io/" target="_blank">
                                    Status
                                </Link>
                            </section>
                        </div>
                    </div>
                </div>

                <div className={`${styles.copyrights}`}>
                    <div className={`${styles.content} ${styles.beside}`}>
                        <section className={`${styles.section} ${styles.links}`}>
                            <div>
                                <Link href="https://nordcom.io/legal/terms-of-service/">Terms of Service</Link>
                            </div>
                            <div>
                                <Link href="https://nordcom.io/legal/privacy-policy/">Privacy Policy</Link>
                            </div>
                        </section>
                        <section className={styles.section}>
                            <div>
                                <Link href="https://nordcom.io/">&copy; 2023 Nordcom Group Inc.</Link>
                            </div>
                        </section>
                    </div>
                </div>
            </footer>
        </>
    );
}
