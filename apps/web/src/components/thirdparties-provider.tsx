'use client';

import type { Shop } from '@/api/shop';
import { useCartUtils } from '@/hooks/useCartUtils';
import type { Locale } from '@/utils/locale';
import * as Prismic from '@/utils/prismic';
import { GoogleTagManager } from '@next/third-parties/google';
import { PrismicPreview } from '@prismicio/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
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
        if (!shop?.configuration?.thirdParty?.googleTagManager) {
            return () => {};
        }

        const timeout = setTimeout(() => {
            if (delayedContent || !shop?.configuration?.thirdParty?.googleTagManager) {
                return;
            }

            setDelayedContent(() => (
                <>
                    <GoogleTagManager gtmId={shop!.configuration!.thirdParty!.googleTagManager!} />
                    <PrismicPreview repositoryName={Prismic.repositoryName} />
                    <SpeedInsights />
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
                console.error(error.message);
                toast.error(error.message, options);
            });
        } else {
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
