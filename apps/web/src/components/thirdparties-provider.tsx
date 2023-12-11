'use client';

import type { Shop } from '@/api/shop';
import { useCartUtils } from '@/hooks/useCartUtils';
import type { Locale } from '@/utils/locale';
import * as Prismic from '@/utils/prismic';
import { useEffect, useState, type ReactNode } from 'react';
import { toast } from 'sonner';

export type ThirdPartiesProviderProps = {
    shop: Shop;
    locale: Locale;
    children: ReactNode;
};
export const ThirdPartiesProvider = ({ shop, locale, children }: ThirdPartiesProviderProps) => {
    const [delayedContent, setDelayedContent] = useState<ReactNode>(null);
    useEffect(() => {
        const timeout = setTimeout(async () => {
            if (delayedContent) return;

            const { SpeedInsights } = await import('@vercel/speed-insights/next');
            const { PrismicPreview } = await import('@prismicio/next');
            const { GoogleTagManager } = await import('@next/third-parties/google');
            const { Analytics: VercelAnalytics } = await import('@vercel/analytics/react');

            setDelayedContent(() => (
                <>
                    {shop?.configuration?.thirdParty?.googleTagManager ? (
                        <GoogleTagManager gtmId={shop!.configuration!.thirdParty!.googleTagManager!} />
                    ) : null}
                    <PrismicPreview repositoryName={Prismic.repositoryName} />
                    <SpeedInsights />
                    <VercelAnalytics />
                </>
            ));

            // Wait 6.75 seconds to prevent tag manager from destroying our ranking.
        }, 6_750);

        return () => clearTimeout(timeout);
    }, []);

    // Not really a third party, but it's a good place to put it.
    const { cartError } = useCartUtils({
        locale
    });

    useEffect(() => {
        if (!cartError) return;

        const options = {
            important: true
        };

        if (Array.isArray(cartError)) {
            cartError.forEach((error) => {
                if (!error.message) return;

                console.error(error.message);
                toast.error(error.message, options);
            });
        } else {
            if (!cartError.message) return;

            console.error(cartError.message);
            toast.error(cartError.message, options);
        }
    }, [cartError]);

    return (
        <>
            {children}
            {delayedContent}
        </>
    );
};
