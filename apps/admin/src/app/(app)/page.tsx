import { auth, currentUser } from '@clerk/nextjs/server';
import { Accented, Button, Heading, Label } from '@nordcom/nordstar';
import { ChevronRight, Plus, Settings, Store } from 'lucide-react';
import type { Metadata, Route } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { SignOutButton } from '@/components/sign-out-button';
import { getShopsForUser } from '@/utils/fetchers';

export const metadata: Metadata = {
    title: 'Your Shops',
};

/**
 * The admin landing view: an authenticated operator picks which of their shops to manage, connects a
 * new one, or signs out. Shops are scoped to the operator's email — the Clerk subject is not the
 * platform `users.id`, so {@link getShopsForUser}'s email fallback is the stable key. An
 * unauthenticated visitor is redirected to sign-in.
 *
 * @returns The shop-chooser screen for an authenticated operator.
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

    // The Clerk subject does not key the platform `users` row; resolve shops by the email fallback.
    const shops = await getShopsForUser(email, email);

    const firstName = operator?.firstName || operator?.fullName?.split(' ').at(0) || null;

    const shopsActions = shops.map(({ id, domain, name }, index) => (
        <Link
            key={id}
            href={`/${domain}/` as Route}
            title={name}
            className="group fade-in slide-in-from-bottom-2 flex animate-in items-center gap-3 rounded-xl border-3 border-border border-solid bg-background/40 p-3 transition-all duration-500 hover:-translate-y-0.5 hover:border-primary"
            style={{ animationDelay: `${index * 60}ms`, animationFillMode: 'both' }}
        >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-lg border-3 border-border border-solid bg-card font-black text-lg uppercase transition-colors group-hover:border-primary group-hover:text-primary">
                {name.charAt(0)}
            </span>
            <span className="flex min-w-0 flex-col">
                <span className="truncate font-bold leading-tight">{name}</span>
                <span className="truncate text-muted-foreground text-xs">{domain}</span>
            </span>
            <ChevronRight className="ml-auto size-5 shrink-0 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:text-primary" />
        </Link>
    ));

    return (
        <main className="flex min-h-screen w-full flex-col items-center justify-center p-4 sm:p-8">
            <div className="relative w-full max-w-xl">
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

                            <div className="flex items-center gap-2">
                                <Link
                                    href={'/accounts/' as Route}
                                    title="Account settings"
                                    aria-label="Account settings"
                                    className="flex size-9 items-center justify-center rounded-lg border-3 border-border border-solid transition-colors hover:border-primary hover:text-primary"
                                >
                                    <Settings className="size-4" />
                                </Link>
                                <SignOutButton />
                            </div>
                        </section>

                        <div className="flex flex-col">
                            <Label as="div" className="text-muted-foreground">
                                Hi <Accented>{firstName || 'there'}</Accented>
                            </Label>
                            <Heading level="h1">Choose a Shop</Heading>
                        </div>
                    </header>

                    {shops.length > 0 ? (
                        <section className="flex w-full flex-col gap-2">{shopsActions}</section>
                    ) : (
                        <section className="flex flex-col items-center gap-2 rounded-xl border-3 border-border border-dashed p-8 text-center">
                            <Store className="size-7 text-muted-foreground" aria-hidden="true" />
                            <Label as="div">No shops yet</Label>
                            <span className="text-balance text-muted-foreground text-sm">
                                Connect your first shop below to start managing it.
                            </span>
                        </section>
                    )}

                    <footer className="border-0 border-border border-t-3 border-solid pt-4">
                        <Button
                            as={Link}
                            href={'/new/' as Route}
                            color="primary"
                            variant="solid"
                            className="h-12 w-full"
                            icon={<Plus className="size-5" />}
                        >
                            Connect a new Shop
                        </Button>
                    </footer>
                </article>
            </div>
        </main>
    );
}
