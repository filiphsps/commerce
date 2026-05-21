'use client';

import Image from 'next/image';
import { useEffect } from 'react';

import { Button } from '@/components/actionable/button';
import PageContent from '@/components/page-content';
import { useOptionalShop } from '@/components/shop/provider';
import { Content } from '@/components/typography/content';
import Heading from '@/components/typography/heading';
import { Label } from '@/components/typography/label';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    // Next.js error boundary: surface unhandled errors to the browser console for
    // debugging. This is the documented sink for client-visible errors and is
    // explicitly exempted from the no-console policy.
    useEffect(() => console.error(error), [error]);

    const ctx = useOptionalShop();
    const shopName = ctx?.shop?.name;
    const logo = ctx?.shop?.design?.header?.logo;

    return (
        <>
            <PageContent className="block">
                {logo?.src ? (
                    <Image
                        src={logo.src}
                        alt={logo.alt ?? shopName ?? 'Shop logo'}
                        width={logo.width}
                        height={logo.height}
                        className="mb-4 max-h-12 w-auto object-contain object-left"
                        unoptimized
                    />
                ) : null}

                <Heading
                    title={`Oh no! Something went wrong`}
                    subtitle={<Label>Internal server error</Label>}
                    reverse
                    bold
                />
            </PageContent>

            <Content className="min-w-none">
                <p>
                    Sorry, but an unexpected error occurred at {shopName ? <b>{shopName}</b> : 'this shop'}.
                    <br />
                    If this keeps happening please reach out to our support.
                </p>

                <p>In the meantime, here&apos;s a few things you can try:</p>
                <ul>
                    <li>
                        <b>Refresh the page</b> (sometimes this helps).
                    </li>
                    <li>
                        <b>Try again</b> in 10 minutes.
                    </li>
                    <li>
                        <b>Contact support</b> and tell us what happened.
                    </li>
                </ul>
            </Content>

            <Button onClick={reset} className="h-10 w-36 min-w-fit">
                Reload page
            </Button>
        </>
    );
}
