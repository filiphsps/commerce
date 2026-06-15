'use client';

import type { OnlineShop } from '@nordcom/commerce-db';
import dynamic from 'next/dynamic';
import type { ReactNode } from 'react';
import { isPreviewEnv } from '@/utils/is-preview-env';

// `react-live-chat-loader` only mounts for production tenants with Intercom configured, so keep it
// out of the global providers chunk and load it on demand.
const LiveChatWidget = dynamic(() => import('@/components/live-chat-widget').then((m) => m.LiveChatWidget), {
    ssr: false,
});

/**
 * Resolves the live-chat provider key to render, or `null` when the launcher must stay hidden.
 *
 * Gates on two independent failure modes the raw `thirdParty.intercom` value can't express on its own:
 * a blank/whitespace id (the operator has no admin control to clear a stale value migrated from the
 * legacy store, so an empty-but-present id must read as "unconfigured"), and a non-production host.
 * `NODE_ENV` is `'production'` on every Vercel build — including preview and staging deploys — so the
 * environment flag alone can't tell a real tenant from a preview; defer to the same host-aware
 * {@link isPreviewEnv} check the analytics provider uses so the widget only boots on real hosts.
 *
 * @param params.intercom - The tenant's configured Intercom app id, if any.
 * @param params.hostname - Request hostname used to suppress preview/staging/dev deployments.
 * @returns The trimmed Intercom app id to mount, or `null` to render nothing.
 */
export function resolveLiveChatProviderKey({
    intercom,
    hostname,
}: {
    intercom?: string;
    hostname?: string;
}): string | null {
    const key = intercom?.trim();
    if (!key) {
        return null;
    }

    // `isPreviewEnv` returns `null` (production env, unknown host) as well as `false`; only an explicit
    // `true` should suppress, so a plain truthiness check is intentional here.
    if (isPreviewEnv(hostname)) {
        return null;
    }

    return key;
}

export type LiveChatProviderProps = {
    shop: OnlineShop;
    hostname?: string;
    children: ReactNode;
};
/**
 * Client provider that mounts the Intercom live-chat widget on real production hosts when configured.
 *
 * @param props.shop - Shop record providing the Intercom app ID and primary accent color.
 * @param props.hostname - Request hostname; preview/staging/dev deployments suppress the launcher.
 * @param props.children - Subtree rendered both with and without the live-chat widget.
 * @returns The children, optionally wrapped with the Intercom provider and inline init script.
 */
export const LiveChatProvider = ({
    shop: {
        thirdParty: { intercom } = {},
        design: { accents },
    },
    hostname,
    children,
}: LiveChatProviderProps) => {
    // TODO: Support more than just Intercom.
    const providerKey = resolveLiveChatProviderKey({ intercom, hostname });
    if (!providerKey) {
        return <>{children}</>;
    }

    const primaryColor = accents.find(({ type }) => type === 'primary');
    return (
        <>
            {children}

            <LiveChatWidget intercom={providerKey} color={primaryColor?.color} />
        </>
    );
};
