import { getErrorFromCode } from '@/utils/errors';
import { Card, Heading } from '@nordcom/nordstar';
import { notFound } from 'next/navigation';
import styles from './page.module.scss';

export type DocsErrorsPageParams = {
    code: string;
};
export default async function DocsErrorsPage({ params: { code } }: { params: DocsErrorsPageParams }) {
    // TODO: Forward to uppercase version of code if not uppercase.

    const ErrorKind = getErrorFromCode(code.toUpperCase() as any);
    if (!ErrorKind) return notFound();

    // Trigger the error so we can access the data.
    const error = new ErrorKind();

    return (
        <article className={`${styles.container}`}>
            <div className={`${styles.heading}`}>
                <Heading>{error.name}</Heading>
                <Heading level="h2">
                    {error.statusCode}: <code>{error.code}</code>
                </Heading>
            </div>

            <Card className={`${styles.content}`}>
                <Heading level="h4" as="h3">
                    Details
                </Heading>
                <div className={styles.section}>
                    <p>{error.details}.</p>
                </div>

                <Heading level="h4" as="h3">
                    Causes
                </Heading>
                <div className={styles.section}>
                    <p>TODO: Add a list of causes.</p>
                    <ul>
                        <li>A possible cause.</li>
                        <li>Another way to trigger it.</li>
                        <li>And the last one.</li>
                    </ul>
                    <p>Finish off with a paragraph or even just a short text.</p>
                </div>

                <Heading level="h4" as="h3">
                    Code
                </Heading>
                <div className={styles.section}>
                    <p>
                        <code>new {ErrorKind.name}();</code>
                    </p>
                </div>
            </Card>
        </article>
    );
}
