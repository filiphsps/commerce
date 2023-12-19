import type { Shop } from '@/api/shop';
import { BuildConfig } from '@/utils/build-config';
import type { Locale } from '@/utils/locale';
import type { ReactNode } from 'react';
import { IntercomProvider } from 'react-use-intercom';

export type LiveChatProps = {
    shop: Shop;
    locale: Locale;
    children: ReactNode;
};
export const LiveChat = ({ shop, locale, children }: LiveChatProps) => {
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
            {children}
        </IntercomProvider>
    );
};

export type ThirdPartiesProviderProps = {
    shop: Shop;
    locale: Locale;
    children: ReactNode;
};
export const ThirdPartiesProvider = ({ shop, locale, children }: ThirdPartiesProviderProps) => {
    if (BuildConfig.environment === 'development') return <>{children}</>;

    return (
        <>
            {children}
        </>
    );
};
