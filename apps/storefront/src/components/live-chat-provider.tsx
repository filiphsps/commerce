'use client';

import { Intercom, LiveChatLoaderProvider } from 'react-live-chat-loader';

import type { OnlineShop } from '@nordcom/commerce-db';

import { BuildConfig } from '@/utils/build-config';

import type { Locale } from '@/utils/locale';
import type { ReactNode } from 'react';

export type LiveChatProviderProps = {
    shop: OnlineShop;
    locale: Locale;
    children: ReactNode;
};
export const LiveChatProvider = ({
    shop: {
        thirdParty: { intercom } = {},
        design: { accents }
    },
    children
}: LiveChatProviderProps) => {
    // TODO: Support more than just Intercom.
    if (BuildConfig.environment !== 'production' || !intercom) {
        return <>{children as any}</>;
    }

    const primaryColor = accents.find(({ type }) => type === 'primary');
    return (
        <>
            {children as any}

            {intercom ? (
                <>
                    <LiveChatLoaderProvider providerKey={intercom} provider="intercom" idlePeriod={1500}>
                        <Intercom color={primaryColor?.color} />
                    </LiveChatLoaderProvider>

                    <script
                        id="live-chat-intercom"
                        type="text/javascript"
                        //strategy="afterInteractive"
                    >
                        {`window.intercomSettings = ${JSON.stringify({
                            api_base: 'https://api-iam.intercom.io',
                            app_id: intercom,
                            action_color: primaryColor?.color,
                            background_color: primaryColor?.color,
                            hide_default_launcher: false
                        })};`}
                    </script>
                </>
            ) : (
                <div>hello</div>
            )}
        </>
    );
};
