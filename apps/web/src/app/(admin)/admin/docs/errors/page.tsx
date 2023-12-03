import type { Error } from '@/utils/errors';
import { MissingContextProviderError, getAllErrorCodes, getErrorFromCode } from '@/utils/errors';
import { Card, Heading } from '@nordcom/nordstar';
import type { Metadata } from 'next';
import Link from 'next/link';
import styles from './page.module.scss';

export const metadata: Metadata = {
    title: 'Errors'
};

export type DocsErrorsPageParams = {};
export default async function DocsErrorsPage({ params: {} }: { params: DocsErrorsPageParams }) {
    const errors = getAllErrorCodes();

    return (
        <article className={`${styles.container}`}>
            <div className={`${styles.heading}`}>
                <Heading level="h1">Errors Codes</Heading>
                <Heading level="h2">These are all of the currently documented error codes</Heading>
            </div>

            <div className={styles.content}>
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
                            className={styles.section}
                            key={error.code}
                            draggable={false}
                        >
                            <Heading level="h4" as="h3">
                                {error.code}
                            </Heading>
                            <p>
                                {error.statusCode}: {error.details}.
                            </p>
                        </Card>
                    );
                })}
            </div>
        </article>
    );
}
