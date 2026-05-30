'use client';

import { Intercom, LiveChatLoaderProvider } from 'react-live-chat-loader';

export type LiveChatWidgetProps = {
    intercom: string;
    color?: string;
};

/**
 * Idle-loaded Intercom widget, split into its own chunk.
 *
 * `react-live-chat-loader` is large and only ever mounts for production tenants with Intercom
 * configured, so {@link import('./live-chat-provider').LiveChatProvider} lazy-mounts this via
 * `dynamic(..., { ssr: false })` to keep the dependency out of the global providers chunk that
 * every page ships.
 *
 * @param props.intercom - The tenant's Intercom app ID / provider key.
 * @param props.color - Primary accent color applied to the launcher and inline settings.
 * @returns The Intercom loader provider plus its inline `intercomSettings` bootstrap script.
 */
export const LiveChatWidget = ({ intercom, color }: LiveChatWidgetProps) => {
    return (
        <>
            <LiveChatLoaderProvider providerKey={intercom} provider="intercom" idlePeriod={1500}>
                <Intercom color={color} />
            </LiveChatLoaderProvider>

            <script id="live-chat-intercom" type="text/javascript">
                {`window.intercomSettings = ${JSON.stringify({
                    api_base: 'https://api-iam.intercom.io',
                    app_id: intercom,
                    action_color: color,
                    background_color: color,
                    hide_default_launcher: false,
                    // JSON.stringify doesn't escape `</script>`, so an admin-editable `intercom`
                    // value containing `</script><script>...` would have broken out of this inline
                    // script. Replace `<` with its JS unicode escape — valid inside a string
                    // literal, can't terminate the script element.
                }).replace(/</g, '\\u003c')};`}
            </script>
        </>
    );
};

LiveChatWidget.displayName = 'Nordcom.LiveChatWidget';
