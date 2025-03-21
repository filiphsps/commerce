import type { Error } from '@nordcom/commerce-errors';
import { getAllErrorCodes, getErrorFromCode, MissingContextProviderError } from '@nordcom/commerce-errors';
import { Card, Heading } from '@nordcom/nordstar';

import Link from 'next/link';

import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Errors'
};

export default async function DocsErrorsPage({}: {}) {
    const errors = getAllErrorCodes();

    return (
        <>
            <header>
                <Heading level="h1">Errors Codes</Heading>
                <Heading level="h2">These are all of the currently documented error codes</Heading>
            </header>

            <section className="">
                {errors.map((code) => {
                    const ErrorKind = getErrorFromCode(code.toUpperCase() as any);
                    if (!ErrorKind) return null;

                    let error!: Error<string>;
                    if (ErrorKind instanceof MissingContextProviderError) {
                        error = new (ErrorKind as typeof MissingContextProviderError)(
                            'useSomeContext',
                            'SomeContextProvider'
                        );
                    } else {
                        error = new ErrorKind();
                    }

                    return (
                        <Card
                            id={error.code}
                            as={Link}
                            href={`/docs/errors/${error.code}/`}
                            key={error.code}
                            draggable={false}
                            className="flex flex-col"
                        >
                            <Card.Header>
                                <Heading level="h4" as="h3">
                                    {error.code}
                                </Heading>
                            </Card.Header>

                            <p>
                                {error.statusCode}: {error.details}.
                            </p>
                        </Card>
                    );
                })}
            </section>
        </>
    );
}
