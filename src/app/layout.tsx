import 'destyle.css';
// Global style
import '@/style/app.scss';

import { BuildConfig } from '@/utils/build-config';
import { Lexend_Deca } from 'next/font/google';

const font = Lexend_Deca({
    weight: 'variable',
    subsets: ['latin'],
    display: 'swap',
    variable: '--font-primary',
    preload: true
});

export async function generateMetadata({}) {
    return {
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
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html>
            <head lang={BuildConfig.i18n.default} className={font.variable}></head>
            <body>{children}</body>
        </html>
    );
}
