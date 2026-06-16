import { UserButton } from '@clerk/nextjs';
import { auth, currentUser } from '@clerk/nextjs/server';
import { Accented, Button, Heading, Label } from '@nordcom/nordstar';
import { Building2, ChevronRight, Plus, Store } from 'lucide-react';
import type { Metadata, Route } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { clerkAppearance } from '@/lib/clerk-appearance';
import { type ChooserOrg, getChooserOrgs } from '@/lib/orgs-convex';

export const metadata: Metadata = {
    title: 'Choose a storefront',
};

/**
 * Renders one org group: a section header (org name + a per-org "New storefront" action) followed by a
 * grid of Nordstar shop cards linking to each storefront's `/[domain]/` workspace. The card pattern
 * (border-3, rounded-xl, hover lift, staggered fade-in) matches the previous shop chooser so the
 * surface reads as native admin chrome. An org with no shops shows a compact "create your first one"
 * prompt in place of the grid.
 *
 * @param props.org - The org group with its identity and owned shops.
 * @param props.baseDelay - Animation-delay offset (ms) so cards fade in staggered across groups.
 * @returns The org section element.
 */
function OrgGroup({ org, baseDelay }: { org: ChooserOrg; baseDelay: number }) {
    return (
        <section className="flex flex-col gap-3">
            <header className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                    <Building2 className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <Label as="div" className="truncate uppercase tracking-wide">
                        {org.name}
                    </Label>
                </div>
                <Button
                    as={Link}
                    href={'/new/' as Route}
                    variant="outline"
                    className="h-9 shrink-0"
                    icon={<Plus className="size-4" />}
                >
                    New storefront
                </Button>
            </header>

            {org.shops.length > 0 ? (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {org.shops.map((shop, index) => (
                        <Link
                            key={shop.domain}
                            href={`/${shop.domain}/` as Route}
                            title={shop.name}
                            className="group fade-in slide-in-from-bottom-2 flex animate-in items-center gap-3 rounded-xl border-3 border-border border-solid bg-background/40 p-3 transition-all duration-500 hover:-translate-y-0.5 hover:border-primary"
                            style={{ animationDelay: `${baseDelay + index * 60}ms`, animationFillMode: 'both' }}
                        >
                            <span className="flex size-11 shrink-0 items-center justify-center rounded-lg border-3 border-border border-solid bg-card font-black text-lg uppercase transition-colors group-hover:border-primary group-hover:text-primary">
                                {shop.name.charAt(0)}
                            </span>
                            <span className="flex min-w-0 flex-col">
                                <span className="truncate font-bold leading-tight">{shop.name}</span>
                                <span className="truncate text-muted-foreground text-xs">{shop.domain}</span>
                            </span>
                            <ChevronRight className="ml-auto size-5 shrink-0 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:text-primary" />
                        </Link>
                    ))}
                </div>
            ) : (
                <p className="rounded-xl border-3 border-border border-dashed p-4 text-center text-muted-foreground text-sm">
                    No storefronts in this organization yet.
                </p>
            )}
        </section>
    );
}

/**
 * The admin landing view: the bespoke org×storefront chooser. For the authenticated operator it lists
 * every Clerk org they belong to (via the `orgMemberships` mirror joined to `shops.by_clerk_org`),
 * grouped by org, each with Nordstar shop cards linking to `/[domain]/` plus a per-org "New storefront"
 * action; a footer offers "Create organization" (→ `/onboarding`). The storefront WITHIN an org is
 * chosen here / via the `/[domain]/` route — org selection itself lives in the header's
 * `<OrganizationSwitcher>`. An operator with no orgs/storefronts sees the empty state.
 *
 * Unauthenticated visitors (or a Clerk session without a primary email) are redirected to sign-in.
 *
 * @returns The org×storefront chooser screen.
 */
export default async function OverviewPage() {
    const { userId } = await auth();
    if (!userId) {
        redirect('/auth/sign-in/' as Route);
    }

    const operator = await currentUser();
    const email = operator?.primaryEmailAddress?.emailAddress?.trim().toLowerCase();
    if (!email) {
        redirect('/auth/sign-in/' as Route);
    }

    const orgs = await getChooserOrgs();
    const firstName = operator?.firstName || operator?.fullName?.split(' ').at(0) || null;

    return (
        <main className="flex min-h-screen w-full flex-col items-center justify-center p-4 sm:p-8">
            <div className="relative w-full max-w-2xl">
                {/* Subtle pink halo for atmosphere — echoes the primary accent without breaking the flat-dark canvas. */}
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute top-0 left-1/2 -z-10 h-48 w-3/4 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl"
                />

                <article className="flex flex-col gap-6 rounded-2xl border-3 border-border border-solid bg-card/40 p-5 backdrop-blur-sm sm:p-6">
                    <header className="flex flex-col gap-4">
                        <section className="flex items-start justify-between gap-3">
                            <Link href="/" title="Nordcom Commerce" className="block">
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

                            <UserButton
                                appearance={clerkAppearance}
                                userProfileMode="navigation"
                                userProfileUrl="/accounts/"
                            />
                        </section>

                        <div className="flex flex-col">
                            <Label as="div" className="text-muted-foreground">
                                Hi <Accented>{firstName || 'there'}</Accented>
                            </Label>
                            <Heading level="h1">Choose a storefront</Heading>
                        </div>
                    </header>

                    {orgs.length > 0 ? (
                        // Each group renders its own per-org empty state, so an operator with orgs but no
                        // storefronts still sees where to create the first one.
                        <section className="flex flex-col gap-6">
                            {orgs.map((org, index) => (
                                <OrgGroup key={org.clerkOrgId} org={org} baseDelay={index * 120} />
                            ))}
                        </section>
                    ) : (
                        <section className="flex flex-col items-center gap-2 rounded-xl border-3 border-border border-dashed p-8 text-center">
                            <Store className="size-7 text-muted-foreground" aria-hidden="true" />
                            <Label as="div">No storefronts yet</Label>
                            <span className="text-balance text-muted-foreground text-sm">
                                No storefronts yet — create your first one.
                            </span>
                        </section>
                    )}

                    <footer className="border-0 border-border border-t-3 border-solid pt-4">
                        <Button
                            as={Link}
                            href={'/onboarding/' as Route}
                            color="primary"
                            variant="solid"
                            className="h-12 w-full"
                            icon={<Plus className="size-5" />}
                        >
                            Create organization
                        </Button>
                    </footer>
                </article>
            </div>
        </main>
    );
}
