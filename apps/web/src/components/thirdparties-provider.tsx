import type { Shop } from '@/api/shop';
import { BuildConfig } from '@/utils/build-config';
import type { Locale } from '@/utils/locale';
import { getClientBrowserParameters } from '@shopify/hydrogen-react';
import { useEffect, type ReactNode } from 'react';
import { IntercomProvider, useIntercom } from 'react-use-intercom';

export type ThirdPartiesProviderProps = {
    shop: Shop;
    locale: Locale;
    children: ReactNode;
};

export const LiveChat = ({ shop, locale, children }: ThirdPartiesProviderProps) => {
    // TODO: Support other live chat providers.
    if (!shop.configuration.thirdParty?.intercom || BuildConfig.environment === 'development') {
        return <>{children}</>;
    }

    const { update } = useIntercom();

    // Update attributes.
    useEffect(() => {
        const { uniqueToken: userId } = getClientBrowserParameters();

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
    //const { uniqueToken: userId } = getClientBrowserParameters();

    return (
        <IntercomProvider
            appId={intercom.appId}
            autoBoot={true}
            shouldInitialize={true}
            autoBootProps={{
                alignment: 'right',
                actionColor: intercom.actionColor,
                backgroundColor: intercom.backgroundColor,
                //userId,
                customAttributes: {
                    locale: locale.code
                }
            }}
            initializeDelay={6750}
        >
            <LiveChat shop={shop} locale={locale}>
                {children}
            </LiveChat>
        </IntercomProvider>
    );
};

export const ThirdPartiesProvider = ({ shop, locale, children }: ThirdPartiesProviderProps) => {
    return (
        <LiveChatWrapper shop={shop} locale={locale}>
            {children}
        </LiveChatWrapper>
    );
};
