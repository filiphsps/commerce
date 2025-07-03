import { Card, Heading } from '@nordcom/nordstar';

import Link from 'next/link';

import type { ReactNode } from 'react';

export const components = {
    Code: ({ content }: { content: string }) => <code>{content}</code>,
    Fence: ({ content, language }: { content: string; language?: string }) => (
        <Card>
            <pre>
                <code
                    data-multiline="true"
                    data-language={language}
                    children={content}
                    className={language ? `language-${language}` : undefined}
                />
            </pre>
        </Card>
    ),
    Heading,
    Link,
    Spacer: ({ h }: { h: number }) => <div className="spacer" style={{ height: `${h || 1}rem` }} />,
    Card: ({ children }: { children: ReactNode }) => <Card className="card">{children as any}</Card>
};
