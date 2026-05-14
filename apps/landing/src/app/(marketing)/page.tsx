import { Accented, Card, Heading } from '@nordcom/nordstar';
import type { Metadata } from 'next';

import Link from 'next/link';

export type IndexAdminPageParams = {};

export const metadata: Metadata = {
    title: {
        absolute: 'Nordcom Commerce — the Headless Commerce Solution',
    },
    description:
        'Bring the benefits of headless e-commerce to your store without any of the hassles that usually comes with it',
};

export default async function IndexAdminPage({}: {}) {
    return (
        <>
            <div className="flex w-full max-w-full flex-col gap-[0.5rem] overflow-hidden">
                <Heading>
                    Commerce by <Accented>Nordcom</Accented> AB
                </Heading>
                <Heading level="h2">
                    Turns out you can have your cake and eat it too! Get all of the benefits of going{' '}
                    <Accented>headless</Accented> without any of the hassles that usually comes with
                </Heading>
            </div>

            <article className="mt-7 flex flex-col gap-7">
                <Card variant="solid">
                    <Heading level="h4" as="div">
                        Everything on this site a work in progress and subject to change at any time. If you&apos;d like
                        to learn more please reach out to us on{' '}
                        <Link
                            target="_blank"
                            rel="noopener noreferrer"
                            href="https://twitter.com/NordcomInc/"
                            title="@NordcomInc on Twitter"
                            className="normal-case"
                        >
                            X (Twitter)
                        </Link>
                    </Heading>
                </Card>
            </article>
        </>
    );
}
