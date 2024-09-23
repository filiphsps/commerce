import { Heading } from '@nordcom/nordstar';

import { headers } from 'next/headers';
import Link from 'next/link';

import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';
export const dynamicParams = false;

const SUPPORT_EMAIL = 'hi@nordcom.io';

export type ErrorPageProps = {
    params: {
        code: string;
    };
    searchParams: {
        shop: string | undefined;
    };
};

const ERROR_CODES = {
    'unknown-error': {
        code: 500,
        title: 'Unknown Error',
        description: "We're sorry, but an unknown error occurred. Please try again later."
    },
    'unknown-shop': {
        code: 404,
        title: 'Unknown or Shop',
        description:
            "We're sorry, but the shop you're trying to access appears to be unavailable at this time. This could be due to an invalid shop identifier or a temporary technical issue."
    }
};
export async function generateStaticParams() {
    return Object.keys(ERROR_CODES).map((code) => ({
        code
    }));
}

export async function generateMetadata({ params: { code } }: ErrorPageProps): Promise<Metadata> {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    const error = ERROR_CODES[code as keyof typeof ERROR_CODES] || ERROR_CODES['unknown-error'];

    return {
        title: error.title,
        description: error.description
    };
}

export default function StatusPage({ params: { code }, searchParams: { shop } }: ErrorPageProps) {
    const hostname = shop || headers().get('x-nordcom-shop');
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    const error = ERROR_CODES[code as keyof typeof ERROR_CODES] || ERROR_CODES['unknown-error'];

    const mailTitle = `${shop ? `[${shop}] ` : ''}${error.title}`;
    const mailBody = `(autogenerated details, do not remove: <code>${JSON.stringify({
        hostname: hostname,
        errorCode: code,
        timestamp: Date.now()
    })}</code>)\n\n\n`;

    return (
        <>
            <header>
                <Heading className="block" as="p">
                    <span className="text-7xl leading-none">{error.code}</span>
                </Heading>
                <Heading level="h2" as="h1">
                    <span className="text-4xl leading-tight">{error.title}</span>
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

            <footer className="pt-6 text-sm font-semibold uppercase leading-snug text-gray-500">
                {hostname}, {code.toUpperCase()}, {Date.now()}.
            </footer>
        </>
    );
}
