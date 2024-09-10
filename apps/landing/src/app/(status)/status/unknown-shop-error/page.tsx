import { Heading } from '@nordcom/nordstar';

import Link from 'next/link';

import type { Metadata } from 'next';

const SUPPORT_EMAIL = 'hi@nordcom.io';

export const metadata: Metadata = {
    title: 'Unknown or Invalid Shop',
    robots: {
        index: false,
        follow: true
    }
};

export default function StatusPage({ searchParams: { shop } }: { searchParams: { shop: string | undefined } }) {
    const mailTitle = `${shop ? `[${shop}] ` : ''}Unknown or Invalid Shop`;
    const mailBody = `\n\n\n\n**timestamp: ${new Date().toISOString()}**`;

    return (
        <>
            <header>
                <Heading className="block" as="p">
                    <span className="text-7xl leading-none">404</span>
                </Heading>
                <Heading level="h2" as="h1">
                    <span className="text-4xl leading-tight">{metadata.title as string}</span>
                </Heading>
            </header>

            <div className="prose prose-p:m-0 flex flex-col gap-6 pt-6 text-current *:text-[.95rem] *:leading-relaxed">
                <p className="block max-w-full md:w-[42rem] md:text-base">
                    We&apos;re sorry, but the shop you&apos;re trying to access appears to be unavailable at this time.
                    This could be due to an invalid shop identifier or a temporary technical issue.
                </p>

                <p className="block max-w-full md:w-[42rem] md:text-base">
                    If you believe this is an error, please don&apos;t hesitate to contact the
                    <Link
                        href="https://nordcom.io/"
                        target="_blank"
                        rel="follow"
                        className="not-prose hover:*:text-primary-foreground px-2 font-mono font-bold leading-snug *:transition-colors hover:*:underline"
                    >
                        <code>Nordcom AB</code>
                    </Link>
                    support through
                    <Link
                        href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(mailTitle)}&body=${encodeURIComponent(mailBody)}`}
                        target="_blank"
                        rel="follow"
                        className="not-prose hover:text-primary px-2 font-mono font-bold transition-colors hover:underline"
                    >
                        hi@nordcom.io
                    </Link>
                    We&apos;ll be happy to investigate and assist you further.
                </p>

                <p className="block max-w-full md:w-[42rem] md:text-base">
                    Thank you for your understanding and patience.
                </p>
            </div>
        </>
    );
}
