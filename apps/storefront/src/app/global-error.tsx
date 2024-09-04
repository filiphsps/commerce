'use client';

import { useEffect } from 'react';

import { BuildConfig } from '@/utils/build-config';
import * as Sentry from '@sentry/nextjs';
import NextError from 'next/error';

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
    useEffect(() => {
        if (BuildConfig.environment !== 'production') {
            return;
        }

        Sentry.captureException(error);
    }, [error]);

    return (
        <html lang="en">
            <body>
                <NextError statusCode={500} />
            </body>
        </html>
    );
}
