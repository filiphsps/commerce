import { BuildConfig } from '@/utils/build-config';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    metadataBase: new URL(`https://${BuildConfig.domain}/`),
    robots: {
        follow: true,
        index: true
    },
    alternates: {
        canonical: `https://${BuildConfig.domain}/`
    },
    referrer: 'origin'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html>
            <head />
            <body>{children}</body>
        </html>
    );
}
