import Link from 'next/link';
import type { HTMLProps } from 'react';
import { getServiceUrl } from '@/utils/domains';
import { cn } from '@/utils/tailwind';

const CURRENT_YEAR = new Date().getFullYear();

export type FooterProps = {} & Omit<HTMLProps<HTMLDivElement>, 'children'>;
/**
 * Renders the site footer with legal links, copyright notice, and the deployed git commit hash when available.
 *
 * @param props.className - Additional CSS classes merged onto the `<footer>` element.
 */
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
            <div className="flex max-w-full flex-col items-center justify-center bg-brand text-brand-foreground">
                <div className="flex w-full max-w-page flex-wrap items-center justify-between gap-2 p-4 py-4 md:py-5">
                    <span className="font-extrabold text-sm uppercase tracking-wide">Headless commerce, hosted.</span>

                    {process.env.GIT_COMMIT_SHA ? (
                        <Link
                            href={`${getServiceUrl()}/changelog/`}
                            prefetch={false}
                            className="font-mono text-current text-xs lowercase leading-none transition-opacity hover:underline hover:opacity-70"
                            title={process.env.GIT_COMMIT_SHA}
                        >
                            {process.env.GIT_COMMIT_SHA.slice(0, 7)}
                        </Link>
                    ) : null}
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
