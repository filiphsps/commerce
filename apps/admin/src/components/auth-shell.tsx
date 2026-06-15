import { Heading, Label } from '@nordcom/nordstar';
import type { Route } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';

export type AuthShellProps = {
    /** Small muted line rendered above the title — e.g. a greeting or farewell. */
    eyebrow?: ReactNode;
    /** The screen's primary `h1` heading. */
    title: ReactNode;
    /** The card body — the page's primary content (form, button, status, …). */
    children: ReactNode;
    /** Optional footer, divided from the body, for a primary action or secondary link. */
    footer?: ReactNode;
};

/**
 * Centered, single-card chrome shared by the unauthenticated auth screens (login, logout). Mirrors the
 * shop-chooser landing so an operator crossing the auth boundary never sees a visual seam: the same
 * pink halo, bordered glass card, and logo-led header. The card stays lean (`max-w-md`) because auth
 * screens carry a single decision, where the chooser fans out to a list.
 *
 * @param props.eyebrow - Muted lead-in above the title (optional).
 * @param props.title - The `h1` heading.
 * @param props.children - The card body.
 * @param props.footer - Optional divided footer region.
 * @returns The full-viewport auth shell wrapping the supplied content.
 */
export function AuthShell({ eyebrow, title, children, footer }: AuthShellProps) {
    return (
        <main className="flex min-h-screen w-full flex-col items-center justify-center p-4 sm:p-8">
            <div className="relative w-full max-w-md">
                {/* Subtle pink halo for atmosphere — echoes the primary accent without breaking the flat-dark canvas. */}
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute top-0 left-1/2 -z-10 h-48 w-3/4 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl"
                />

                <article className="flex flex-col gap-6 rounded-2xl border-3 border-border border-solid bg-card/40 p-5 backdrop-blur-sm sm:p-6">
                    <header className="flex flex-col gap-4">
                        <Link href={'/' as Route} title="Nordcom Commerce" className="block w-fit">
                            <Image
                                className="h-full w-auto object-contain object-left"
                                src="/logo.svg"
                                alt="Nordcom Commerce Logo"
                                height={75}
                                width={150}
                                draggable={false}
                                decoding="async"
                                priority={true}
                                loader={undefined}
                            />
                        </Link>

                        <div className="flex flex-col">
                            {eyebrow ? (
                                <Label as="div" className="text-muted-foreground">
                                    {eyebrow}
                                </Label>
                            ) : null}
                            <Heading level="h1">{title}</Heading>
                        </div>
                    </header>

                    {children}

                    {footer ? (
                        <footer className="border-0 border-border border-t-3 border-solid pt-4">{footer}</footer>
                    ) : null}
                </article>
            </div>
        </main>
    );
}
