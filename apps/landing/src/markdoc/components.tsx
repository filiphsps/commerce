import Link from 'next/link';
import Script from 'next/script';

import { Card, Heading } from '@nordcom/nordstar';

import type { ReactNode } from 'react';

export const components = {
    Code: ({ content }: { content: string }) => <code>{content}</code>,
    Fence: ({ content, language }: { content: string; language?: string }) => (
        <Card>
            <Script src="https://cdn.jsdelivr.net/npm/prismjs@1/components/prism-core.min.js" />
            <Script src="https://cdn.jsdelivr.net/npm/prismjs@1/plugins/autoloader/prism-autoloader.min.js" />
            <link href="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/themes/prism.min.css" rel="stylesheet" />

            <pre>
                <code
                    data-multiline="true"
                    data-language={language}
                    children={content}
                    className={`language-${language}`}
                    suppressHydrationWarning={true}
                />
            </pre>
        </Card>
    ),
    Heading,
    Link,
    Spacer: ({ h }: { h: number }) => <div className="spacer" style={{ height: `${h || 1}rem` }} />,
    Card: ({ children }: { children: ReactNode }) => <Card className="card">{children}</Card>
};
