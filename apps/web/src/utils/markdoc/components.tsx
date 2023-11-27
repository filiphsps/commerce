import { Card, Heading } from '@nordcom/nordstar';
import Link from 'next/link';
import Script from 'next/script';

export const components = {
    Code: ({ content, ..._ }: { content: string }) => <code>{content}</code>,
    Fence: ({ content, language, ..._ }: { content: string; language?: string }) => (
        <Card>
            <Script src="https://cdn.jsdelivr.net/npm/prismjs@1/components/prism-core.min.js" />
            <Script src="https://cdn.jsdelivr.net/npm/prismjs@1/plugins/autoloader/prism-autoloader.min.js" />
            <link href="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/themes/prism.min.css" rel="stylesheet" />

            <Heading level="h4" as="div" style={{ paddingBottom: 'calc(var(--block-padding) / 4)' }}>
                {language}
            </Heading>

            <pre>
                <code
                    data-multiline="true"
                    data-language={language}
                    children={content}
                    className={`language-${language}`}
                    suppressHydrationWarning
                />
            </pre>
        </Card>
    ),
    Heading,
    Link,
    Spacer: ({ h, ..._ }: { h: number }) => <div className="spacer" style={{ height: `${h || 1}rem` }} />
};
