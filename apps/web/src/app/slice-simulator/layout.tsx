import { StorefrontApiClient, shopifyApiConfig } from '@/api/shopify';
import { StoreApi } from '@/api/store';
import ProvidersRegistry from '@/components/providers-registry';
import { DefaultLocale } from '@/utils/locale';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    robots: {
        follow: false,
        index: false
    }
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
    const locale = DefaultLocale();
    const shopifyApi = shopifyApiConfig();
    const store = await StoreApi({ locale, api: StorefrontApiClient({ locale }) });

    return (
        <html lang={locale.locale}>
            <body>
                <ProvidersRegistry locale={locale} apiConfig={shopifyApi.public()} store={store}>
                    {children}
                </ProvidersRegistry>
            </body>
        </html>
    );
}
