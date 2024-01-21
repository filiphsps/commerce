import React from 'react';

import BackButton from '@/components/back-button';
import { Content } from '@/components/content';
import { components, config } from '@/markdoc';
import type { Schema } from '@markdoc/markdoc';
import Markdoc from '@markdoc/markdoc';
import { getErrorFromCode } from '@nordcom/commerce-errors';
import { Card, Heading } from '@nordcom/nordstar';
import fs from 'fs';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import path from 'path';
import styles from './page.module.scss';

const CONTENT_DIR = path.join(process.cwd(), 'docs/errors');

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
                <BackButton href="/docs/errors/" />

                <Heading level="h3" as="div" className={styles['status-code']}>
                    {error.statusCode}:
                </Heading>
                <Heading level="h1">{error.details}</Heading>
                <Heading level="h2">{error.code}</Heading>
            </div>

            <Content className={`${styles.content}`}>
                <Card as="section" className={styles.section}>
                    <Heading id="name" level="h4" as="h3">
                        Error Class Name
                    </Heading>
                    <p>{error.name}.</p>
                </Card>

                {!content ? (
                    <>
                        <Card as="section" className={styles.section}>
                            <Heading id="documentation" level="h4" as="h3">
                                Documentation
                            </Heading>

                            <p>TODO.</p>
                        </Card>
                    </>
                ) : (
                    <>{Markdoc.renderers.react(content as any, React, { components })}</>
                )}

                <Card as="section" className={styles.section}>
                    <Heading id="documentation" level="h4" as="h3">
                        Related Articles
                    </Heading>

                    <ul>
                        <li>
                            <Link href="#">TODO</Link>
                        </li>
                        <li>
                            <Link href="#">Another TODO</Link>
                        </li>
                    </ul>
                </Card>
            </Content>
        </article>
    );
}
