'use client';

import type { Shop } from '@/api/shop';
import { useCartUtils } from '@/hooks/useCartUtils';
import type { Locale } from '@/utils/locale';
import * as Prismic from '@/utils/prismic';
import { getClientBrowserParameters } from '@shopify/hydrogen-react';
import { useEffect, useState, type ReactNode } from 'react';
import { IntercomProvider, useIntercom } from 'react-use-intercom';
import { toast } from 'sonner';

export type ThirdPartiesProviderProps = {
    shop: Shop;
    locale: Locale;
    children: ReactNode;
};

export const LiveChat = ({ shop, locale, children }: ThirdPartiesProviderProps) => {
    // TODO: Support other live chat providers.
    if (!shop.configuration.thirdParty?.intercom) {
        return <>{children}</>;
    }

    const { uniqueToken: userId } = getClientBrowserParameters();
    const { update } = useIntercom();

    // Update attributes.
    useEffect(() => {
        update({
            userId,
            customAttributes: {
                locale: locale.code
            }
        });
    }, [, locale]);

    return <>{children}</>;
};

export const LiveChatWrapper = ({ shop, locale, children }: ThirdPartiesProviderProps) => {
    // TODO: Support other live chat providers.
    if (!shop.configuration.thirdParty?.intercom) {
        return <>{children}</>;
    }

    const intercom = shop.configuration.thirdParty?.intercom;
    const { uniqueToken: userId } = getClientBrowserParameters();

    return (
        <IntercomProvider
            appId={intercom.appId}
            autoBoot={true}
            autoBootProps={{
                alignment: 'right',
                actionColor: intercom.actionColor,
                backgroundColor: intercom.backgroundColor,
                userId,
                customAttributes: {
                    locale: locale.code
                }
            }}
        >
            <LiveChat shop={shop} locale={locale}>
                {children}
            </LiveChat>
        </IntercomProvider>
    );
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

    if (!delayedContent) return children;
    return (
        <>
            <LiveChatWrapper shop={shop} locale={locale}>
                {children}
            </LiveChatWrapper>
            {delayedContent}
        </>
    );
};
