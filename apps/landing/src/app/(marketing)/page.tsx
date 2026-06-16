import { Accented, Button, Heading } from '@nordcom/nordstar';
import type { Metadata } from 'next';

import Link from 'next/link';
import { getAdminHostname } from '@/utils/domains';

export type IndexAdminPageParams = {};

export const metadata: Metadata = {
    title: {
        absolute: 'Nordcom Commerce — the Headless Commerce Solution',
    },
    description:
        'A managed storefront, catalog, checkout, and CMS. Composable commerce APIs we host, deploy, and keep fast — you run the store, we run the infrastructure.',
};

/**
 * The headless storefront decomposed into the services Nordcom Commerce manages. Rendered as the
 * hero signature to make the platform's composable nature literal rather than asserted.
 */
const PRIMITIVES = ['Catalog', 'Cart', 'Checkout', 'CMS', 'Search', 'Locales'] as const;

/**
 * What a merchant gets, named by outcome rather than by subsystem. The kicker is a plain noun, not a
 * step number — the capabilities are parallel, not a sequence.
 */
const CAPABILITIES = [
    {
        kicker: 'Storefront',
        title: 'Fast by default',
        body: 'An SEO-ready storefront rendered at the edge. Multi-locale and multi-tenant, deployed and tuned for you.',
    },
    {
        kicker: 'Content',
        title: 'Edit, then it ships',
        body: 'Products, pages, and theme from one admin. Changes publish without a redeploy or a developer.',
    },
    {
        kicker: 'Catalog',
        title: 'Shopify underneath',
        body: 'Catalog and checkout over clean GraphQL. Swap pieces without rebuilding the storefront.',
    },
    {
        kicker: 'Scale',
        title: 'One admin, every shop',
        body: 'Run many storefronts from a single tenant-aware admin. Add a shop, not a deployment.',
    },
] as const;

/**
 * Renders the Nordcom Commerce marketing landing page: a left-aligned hero with the composable-storefront
 * signature, a capabilities grid, and a closing call to action that hands off to the admin origin.
 *
 * @returns The landing page tree.
 */
export default async function IndexAdminPage({}: {}) {
    const adminUrl = `https://${getAdminHostname()}/`;
    const signInUrl = `https://${getAdminHostname()}/auth/sign-in/`;

    return (
        <div className="flex w-full flex-col gap-20 py-8 md:gap-28 md:py-14">
            <section className="flex flex-col items-start gap-7">
                <p className="flex items-center gap-2 font-mono text-foreground-highlight text-xs uppercase tracking-[0.25em]">
                    <span aria-hidden className="size-2 rounded-full bg-brand" />
                    Headless commerce · as a service
                </p>

                <Heading
                    level="h1"
                    className="max-w-4xl text-balance text-5xl leading-[0.95] tracking-tight sm:text-6xl md:text-7xl"
                >
                    Headless commerce, <Accented>minus the headaches</Accented>
                </Heading>

                <p className="max-w-2xl text-balance text-foreground-highlight text-lg leading-relaxed md:text-xl">
                    A managed storefront, catalog, checkout, and CMS — composable commerce APIs we host, deploy, and
                    keep fast. You run the store; we run the infrastructure.
                </p>

                <div className="mt-1 flex flex-wrap items-center gap-3">
                    <Button as={Link} href={adminUrl} color="primary">
                        Open the Admin
                    </Button>
                    <Button as={Link} href={signInUrl} variant="outline">
                        Sign in
                    </Button>
                </div>

                <div className="mt-6 flex w-full flex-col gap-4 overflow-hidden rounded-2xl border-2 border-background-highlight border-solid bg-foreground/[0.04] p-5 md:flex-row md:items-center md:gap-6 md:p-6">
                    <div className="flex shrink-0 items-baseline gap-3">
                        <span className="font-bold font-mono text-brand text-sm uppercase tracking-widest">
                            Storefront
                        </span>
                        <span className="font-mono text-foreground-highlight text-xs lowercase">compiles to</span>
                    </div>
                    <ul className="flex min-w-0 flex-wrap items-center gap-2 md:gap-3">
                        {PRIMITIVES.map((primitive) => (
                            <li
                                key={primitive}
                                className="rounded-md border border-background-highlight border-solid bg-background px-3 py-1.5 font-mono text-foreground text-sm"
                            >
                                {primitive}
                            </li>
                        ))}
                    </ul>
                </div>
            </section>

            <section className="flex flex-col gap-8">
                <Heading level="h4" as="h2" className="text-foreground-highlight">
                    What you ship on
                </Heading>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {CAPABILITIES.map((capability) => (
                        <article
                            key={capability.kicker}
                            className="flex flex-col gap-3 rounded-2xl border-2 border-background-highlight border-solid bg-foreground/[0.04] p-6 transition-colors hover:border-brand md:p-8"
                        >
                            <span className="font-mono text-brand text-xs uppercase tracking-[0.2em]">
                                {capability.kicker}
                            </span>
                            <h3 className="font-extrabold text-2xl uppercase leading-tight">{capability.title}</h3>
                            <p className="text-foreground-highlight leading-relaxed">{capability.body}</p>
                        </article>
                    ))}
                </div>
            </section>

            <section className="flex flex-col items-start gap-6 rounded-2xl border-2 border-brand border-solid bg-brand/10 p-8 md:p-12">
                <Heading level="h3" as="h2" className="max-w-2xl text-balance lowercase">
                    Ready when you are
                </Heading>
                <p className="max-w-xl text-balance text-foreground-highlight text-lg leading-relaxed">
                    Sign in to the admin to spin up a shop, wire your catalog, and go live. Everything here is a work in
                    progress and subject to change — reach out if you want a closer look.
                </p>
                <div className="flex flex-wrap items-center gap-3">
                    <Button as={Link} href={adminUrl} color="primary">
                        Open the Admin
                    </Button>
                    <Button
                        as={Link}
                        href="https://twitter.com/NordcomInc/"
                        target="_blank"
                        rel="noopener noreferrer"
                        variant="outline"
                    >
                        Talk to us
                    </Button>
                </div>
            </section>
        </div>
    );
}
