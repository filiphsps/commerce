'use client';

import type { OnlineShop } from '@nordcom/commerce-db';
import type { ReactNode } from 'react';
import { Intercom, LiveChatLoaderProvider } from 'react-live-chat-loader';
import { BuildConfig } from '@/utils/build-config';
import type { Locale } from '@/utils/locale';

export type LiveChatProviderProps = {
    shop: OnlineShop;
    locale: Locale;
    children: ReactNode;
};
export const LiveChatProvider = ({
    shop: {
        thirdParty: { intercom } = {},
        design: { accents },
    },
    children,
}: LiveChatProviderProps) => {
    // TODO: Support more than just Intercom.
    if (BuildConfig.environment !== 'production' || !intercom) {
        return <>{children}</>;
    }

    const primaryColor = accents.find(({ type }) => type === 'primary');
    return (
        <>
            {children}

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
                            hide_default_launcher: false,
                        })};`}
                    </script>
                </>
            ) : (
                <div>hello</div>
            )}
        </>
    );
};
