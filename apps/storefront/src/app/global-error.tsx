'use client';

import { useEffect } from 'react';

import { BuildConfig } from '@/utils/build-config';
import { primaryFont } from '@/utils/fonts';
import { cn } from '@/utils/tailwind';
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
        <html lang="en" className={cn(primaryFont.className, primaryFont.variable, 'overscroll-x-none')}>
            <body>
                <NextError statusCode={500} />
            </body>
        </html>
    );
}
