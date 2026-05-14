import Link from 'next/link';
import type { HTMLProps } from 'react';
import { cn } from '@/utils/tailwind';

const CURRENT_YEAR = new Date().getFullYear();

export type FooterProps = {} & Omit<HTMLProps<HTMLDivElement>, 'children'>;
export default function Footer({ className, ...props }: FooterProps) {
    return (
        <footer
            {...props}
            className={cn(
                'grid w-full max-w-full grid-cols-[100%] grid-rows-[auto_1fr] overflow-x-hidden',
                '[grid-area:footer]',
                className,
            )}
        >
            <div className="flex max-w-full flex-col items-center justify-center bg-brand text-foreground">
                <div className="w-full max-w-page p-4 py-6 md:py-8">
                    <div className="grid grid-cols-[1fr_1fr] items-center justify-center gap-[0.5rem] md:grid-cols-[1fr_1fr]"></div>

                    <div className="flex items-center justify-between gap-x-1 leading-none">
                        <section className="flex h-8 grow flex-wrap items-center justify-start gap-2">
                            <iframe
                                title="Nordcom Status"
                                src="https://status.nordcom.io/badge?theme=dark"
                                width="auto"
                                height="auto"
                                frameBorder="0"
                                scrolling="no"
                                className="-mb-[3px] -ml-1 h-full w-full"
                            />
                        </section>

                        {process.env.GIT_COMMIT_SHA ? (
                            <section className="flex h-8 items-center justify-end font-semibold text-current text-xs lowercase leading-none empty:hidden md:text-sm">
                                <Link
                                    href="https://shops.nordcom.io/changelog/"
                                    prefetch={false}
                                    className="text-inherit transition-colors hover:text-primary-foreground hover:underline"
                                    title={process.env.GIT_COMMIT_SHA}
                                >
                                    {process.env.GIT_COMMIT_SHA.slice(0, 7)}
                                </Link>
                            </section>
                        ) : null}
                    </div>
                </div>
            </div>

            <div className="flex max-w-full flex-col items-center justify-center bg-background text-foreground">
                <div className="flex w-full max-w-page flex-col items-start justify-center gap-[0.5rem] p-4 py-5 font-base font-semibold leading-snug md:grid md:grid-cols-[1fr_1fr] md:items-center md:justify-center md:py-6">
                    <section className="flex gap-4 font-semibold uppercase">
                        <Link className="block" href="https://nordcom.io/legal/terms-of-service/" prefetch={false}>
                            Terms of Service
                        </Link>

                        <Link className="block" href="https://nordcom.io/legal/privacy-policy/" prefetch={false}>
                            Privacy Policy
                        </Link>
                    </section>
                    <section className="font-bold text-sm md:justify-self-end md:text-right">
                        <Link href="https://nordcom.io/">&copy; 2023-{CURRENT_YEAR} Nordcom AB</Link>
                    </section>
                </div>
            </div>
        </footer>
    );
}
