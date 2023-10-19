import 'destyle.css';
import './globals.css';

import { Config } from '@/utils/Config';
import Header from '@/components/layout/header';
import { Lexend_Deca } from 'next/font/google';
import { NavigationApi } from '@/api/navigation';
import { NextLocaleToLocale } from '@/utils/Locale';
import { StoreApi } from '@/api/store';

const font = Lexend_Deca({
    weight: ['400', '500', '600', '700'],
    subsets: ['latin'],
    display: 'swap',
    variable: '--font-primary',
    preload: true
});

export const metadata = {
    metadataBase: new URL(`https://${Config.domain}`),
    title: {
        // FIXME: Don't hardcode this!
        default: 'Sweet Side of Sweden',
        template: `%s | ${'Sweet Side of Sweden'}`
    },
    robots: {
        follow: true,
        index: true
    }
};

export async function generateStaticParams() {
    return [{ locale: 'en-US' }];
}

export default async function RootLayout({
    children,
    params
}: {
    children: React.ReactNode;
    params: { locale: string };
}) {
    const { locale: localeData } = params;
    const locale = NextLocaleToLocale(localeData);

    const store = await StoreApi({ locale: 'en-US' });
    const navigation = await NavigationApi({ locale: 'en-US' });

    return (
        <html lang={locale.locale} className={font.variable}>
            <body>
                <Header store={store} />
                {children}
            </body>
        </html>
    );
}
