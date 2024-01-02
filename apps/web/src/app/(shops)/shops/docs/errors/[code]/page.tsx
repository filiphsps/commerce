import { getErrorFromCode } from '@/utils/errors';
import { Card, Heading } from '@nordcom/nordstar';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import styles from './page.module.scss';

export type DocsErrorPageParams = {
    code: string;
};
export default async function DocsErrorPage({ params: { code } }: { params: DocsErrorPageParams }) {
    // TODO: Forward to uppercase version of code if not uppercase.

    const ErrorKind = getErrorFromCode(code.toUpperCase() as any);
    if (!ErrorKind) notFound();

    // Trigger the error so we can access the data.
    const error = new ErrorKind();

    return (
        <article className={`${styles.container}`}>
            <div className={`${styles.heading}`}>
                <Heading level="h3" as="div">
                    {error.statusCode}:
                </Heading>
                <Heading level="h1">{error.details}</Heading>
                <Heading level="h2">{error.code}</Heading>
            </div>

            <div className={`${styles.content}`}>
                <Card as="section" className={styles.section}>
                    <Heading id="name" level="h4" as="h3">
                        Error Class Name
                    </Heading>
                    <p>{error.name}.</p>
                </Card>

                <Card as="section" className={styles.section}>
                    <Heading id="causes" level="h4" as="h3">
                        Possible Causes
                    </Heading>

                    <p>
                        <b>TODO:</b> Add a list of causes.
                    </p>

                    <ul>
                        <li>A possible cause.</li>
                        <li>Another way to trigger it.</li>
                        <li>And the last one.</li>
                    </ul>

                    <p>Finish off with a paragraph or even just a short text.</p>
                </Card>

                <Card as="section" className={styles.section}>
                    <Heading id="documentation" level="h4" as="h3">
                        Documentation
                    </Heading>
                    <p>
                        <b>TODO:</b> Load the documentation from some markdown or similar format file here.
                    </p>
                    <p>Maybe better yet, load it from an open source repository.</p>
                </Card>

                <Card as="section" className={styles.section}>
                    <Heading id="code" level="h4" as="h3">
                        Code
                    </Heading>
                    <p>
                        <code data-language="typescript">
                            {`import { ${error.name} } from '@/utils/errors';\n\n`}
                            throw new {error.name}();
                        </code>
                    </p>
                </Card>

                <Card as="section" className={styles.section}>
                    <Heading id="documentation" level="h4" as="h3">
                        Related Articles
                    </Heading>

                    <ul>
                        <li>
                            <Link href="#">An article</Link>
                        </li>
                        <li>
                            <Link href="#">Yet another one</Link>
                        </li>
                    </ul>
                </Card>
            </div>
        </article>
    );
}
