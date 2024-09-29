import { Card, Heading } from '@nordcom/nordstar';

import Link from 'next/link';

import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Documentation'
};

export type DocsPageParams = {};
export default async function DocsPage({}: {}) {
    return (
        <>
            <header>
                <Heading level="h1" title="Documentation">
                    Docu&shy;mentation
                </Heading>
            </header>

            <Card as={Link} href={`/docs/errors/`} draggable={false} className="flex flex-col">
                <Card.Header>
                    <Heading level="h4" as="h3">
                        Error Codes
                    </Heading>
                </Card.Header>

                <p>A list of all error codes that can be returned by the API and what they mean.</p>
            </Card>
        </>
    );
}
