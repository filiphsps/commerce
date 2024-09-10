'use client';

import { Heading } from '@nordcom/nordstar';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import type { Metadata } from 'next';

const SUPPORT_EMAIL = 'hi@nordcom.io';

export const metadata: Metadata = {
    title: 'Unknown or Invalid Shop'
};

export default function StatusPage() {
    const searchParams = useSearchParams();
    const shop = searchParams.get('shop');

    const mailTitle = `${shop ? `[${shop}] ` : ''}Unknown or Invalid Shop`;
    const mailBody = `\n\n\n\n**timestamp: ${new Date().toISOString()}**`;

    return (
        <>
            <Heading className="block" as="p">
                404
            </Heading>
            <Heading level="h2" as="h1">
                Unknown or Invalid Shop
            </Heading>

            <p className="block">
                The specific page, resource or even storefront you are trying to access does not exist. If you believe
                this to be an error, please get in contact with the <code>Nordcom AB</code> support through{' '}
                <Link
                    href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(mailTitle)}&body=${encodeURIComponent(mailBody)}`}
                >
                    hi@nordcom.io
                </Link>
                .
            </p>
        </>
    );
}
