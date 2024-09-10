import styles from '@/components/footer.module.scss';

import { cn } from '@/utils/tailwind';
import Link from 'next/link';

import type { HTMLProps } from 'react';

export type FooterProps = {} & Omit<HTMLProps<HTMLDivElement>, 'children'>;
export default function Footer({ className, ...props }: FooterProps) {
    return (
        <footer {...props} className={cn(styles.footer, '[grid-area:footer]', className)}>
            <div className={styles.container}>
                <div className={cn(styles.content, 'w-full p-4 py-6 md:py-8')}>
                    <div className={cn(styles.blocks, styles.beside)}></div>

                    <div className="flex items-center justify-between gap-x-1 leading-none">
                        <section className="flex h-8 grow flex-wrap items-center justify-start gap-2">
                            <iframe
                                title="Nordcom Status"
                                src="https://status.nordcom.io/badge?theme=dark"
                                width="auto"
                                height="auto"
                                frameBorder="0"
                                scrolling="no"
                                className={cn(styles['status-iframe'], 'h-full w-full')}
                            />
                        </section>

                        {process.env.GIT_COMMIT_SHA ? (
                            <section className="flex h-8 items-center justify-end text-xs font-semibold lowercase leading-none text-current empty:hidden md:text-sm">
                                <Link
                                    href="https://shops.nordcom.io/changelog/"
                                    prefetch={false}
                                    className="hover:text-primary-foreground text-inherit transition-colors hover:underline"
                                    title={process.env.GIT_COMMIT_SHA}
                                >
                                    {process.env.GIT_COMMIT_SHA.slice(0, 7)}
                                </Link>
                            </section>
                        ) : null}
                    </div>
                </div>
            </div>

            <div className={styles.copyrights}>
                <div
                    className={cn(
                        styles.content,
                        styles.beside,
                        'font-base w-full p-4 py-5 font-semibold leading-snug md:py-6'
                    )}
                >
                    <section className={cn(styles.section, styles.links, 'font-semibold')}>
                        <Link className="block" href="https://nordcom.io/legal/terms-of-service/" prefetch={false}>
                            Terms of Service
                        </Link>

                        <Link className="block" href="https://nordcom.io/legal/privacy-policy/" prefetch={false}>
                            Privacy Policy
                        </Link>
                    </section>
                    <section className={cn(styles.section, 'text-sm font-bold')}>
                        <Link href="https://nordcom.io/">&copy; 2023-{new Date().getFullYear()} Nordcom AB</Link>
                    </section>
                </div>
            </div>
        </footer>
    );
}
