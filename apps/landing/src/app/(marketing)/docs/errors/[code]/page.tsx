import styles from './page.module.scss';

import React from 'react';

import { getErrorFromCode } from '@nordcom/commerce-errors';
import { Card, Heading } from '@nordcom/nordstar';

import { components, config } from '@/markdoc';
import Markdoc from '@markdoc/markdoc';
import fs from 'fs';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import path from 'path';

import BackButton from '@/components/back-button';
import { Content } from '@/components/content';

import type { Schema } from '@markdoc/markdoc';

const CONTENT_DIR = path.join(process.cwd(), 'docs/errors');

async function getErrorDocsContent({ slug }: { slug: string }) {
    try {
        const filePath = path.join(CONTENT_DIR, `${slug}.md`);
        const source = fs.readFileSync(filePath, 'utf-8');
        //const matterResult = matter(source);
        //const res = matterResult.data;
        return (Markdoc.transform(Markdoc.parse(source), config) as Schema).children || null;
    } catch {
        return null;
    }
}

export type DocsErrorPageParams = Promise<{
    code: string;
}>;
export default async function DocsErrorPage({ params }: { params: DocsErrorPageParams }) {
    // TODO: Forward to uppercase version of code if not uppercase.

    const { code } = await params;

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
