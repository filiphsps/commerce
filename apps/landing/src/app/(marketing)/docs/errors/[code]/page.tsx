import fs from 'node:fs';
import path from 'node:path';
import type { RenderableTreeNode, Tag } from '@markdoc/markdoc';
import Markdoc from '@markdoc/markdoc';
import type { ApiErrorKind, GenericErrorKind } from '@nordcom/commerce-errors';
import { getErrorFromCode } from '@nordcom/commerce-errors';
import { Card, Heading } from '@nordcom/nordstar';
import { cacheLife } from 'next/cache';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import React from 'react';
import BackButton from '@/components/back-button';
import { Content } from '@/components/content';
import { components, config } from '@/markdoc';

const CONTENT_DIR = path.join(process.cwd(), 'docs/errors');

async function getErrorDocsContent({ slug }: { slug: string }): Promise<RenderableTreeNode[] | null> {
    try {
        const filePath = path.join(CONTENT_DIR, `${slug}.md`);
        const source = fs.readFileSync(filePath, 'utf-8');
        const transformed = Markdoc.transform(Markdoc.parse(source), config);
        return (transformed as Tag).children || null;
    } catch {
        return null;
    }
}

export type DocsErrorPageParams = Promise<{
    code: string;
}>;
export default async function DocsErrorPage({ params }: { params: DocsErrorPageParams }) {
    'use cache';
    cacheLife('max');

    const { code } = await params;

    const ErrorKind = getErrorFromCode(code.toUpperCase() as GenericErrorKind | ApiErrorKind);
    if (!ErrorKind) notFound();

    const content = await getErrorDocsContent({ slug: code });

    const error = new ErrorKind();

    return (
        <article>
            <div className="flex w-full max-w-full flex-col overflow-hidden">
                <BackButton href="/docs/errors/" />

                <Heading level="h3" as="div" className="pt-7">
                    {error.statusCode}:
                </Heading>
                <Heading level="h1" className="max-md:!text-[3.25rem] mt-1">
                    {error.details}
                </Heading>
                <Heading level="h2">{error.code}</Heading>
            </div>

            <Content className="mt-7 flex w-full max-w-full flex-col gap-2">
                <Card as="section" className="max-w-full">
                    <Heading id="name" level="h4" as="h3">
                        Error Class Name
                    </Heading>
                    <p>{error.name}.</p>
                </Card>

                {!content ? (
                    <Card as="section" className="max-w-full">
                        <Heading id="documentation" level="h4" as="h3">
                            Documentation
                        </Heading>

                        <p>TODO.</p>
                    </Card>
                ) : (
                    Markdoc.renderers.react(content, React, { components })
                )}

                <Card as="section" className="max-w-full">
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
