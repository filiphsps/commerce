'use client';

import type { OnlineShop } from '@nordcom/commerce-db';
import dynamic from 'next/dynamic';
import type { ReactNode } from 'react';
import { BuildConfig } from '@/utils/build-config';
import type { Locale } from '@/utils/locale';

// `react-live-chat-loader` only mounts for production tenants with Intercom configured, so keep it
// out of the global providers chunk and load it on demand.
const LiveChatWidget = dynamic(() => import('@/components/live-chat-widget').then((m) => m.LiveChatWidget), {
    ssr: false,
});

export type LiveChatProviderProps = {
    shop: OnlineShop;
    locale: Locale;
    children: ReactNode;
};
/**
 * Client provider that mounts the Intercom live-chat widget in production when configured.
 *
 * @param props.shop - Shop record providing the Intercom app ID and primary accent color.
 * @param props.children - Subtree rendered both with and without the live-chat widget.
 * @returns The children, optionally wrapped with the Intercom provider and inline init script.
 */
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

            <LiveChatWidget intercom={intercom} color={primaryColor?.color} />
        </>
    );
};
