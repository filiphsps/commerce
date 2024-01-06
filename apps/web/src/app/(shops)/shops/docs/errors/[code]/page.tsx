import { Content } from '#/components/content';
import { getErrorFromCode } from '@/utils/errors';
import { components, config } from '@/utils/markdoc';
import type { Schema } from '@markdoc/markdoc';
import Markdoc from '@markdoc/markdoc';
import { Card, Heading } from '@nordcom/nordstar';
import fs from 'fs';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import path from 'path';
import React from 'react';
import styles from './page.module.scss';

const CONTENT_DIR = path.join(process.cwd(), 'src/app/(shops)/shops/docs/errors/content');

async function getErrorDocsContent({ slug }: { slug: string }) {
    try {
        const filePath = path.join(CONTENT_DIR, `${slug}.md`);
        const source = fs.readFileSync(filePath, 'utf-8');
        //const matterResult = matter(source);
        //const res = matterResult.data;
        const content = (Markdoc.transform(Markdoc.parse(source), config) as Schema).children as Schema[];

        return content || null;
    } catch {
        return null;
    }
}

export type DocsErrorPageParams = {
    code: string;
};
export default async function DocsErrorPage({ params: { code } }: { params: DocsErrorPageParams }) {
    // TODO: Forward to uppercase version of code if not uppercase.

    const ErrorKind = getErrorFromCode(code.toUpperCase() as any);
    if (!ErrorKind) notFound();

    const content = await getErrorDocsContent({ slug: code });

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

                {!content ? (
                    <>
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
                    </>
                ) : (
                    <Content>{Markdoc.renderers.react(content as any, React, { components })}</Content>
                )}
            </div>
        </article>
    );
}
