import type { OnlineShop } from '@nordcom/commerce-db';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LiveChatProvider, resolveLiveChatProviderKey } from '@/components/live-chat-provider';
import { isPreviewEnv } from '@/utils/is-preview-env';
import { render } from '@/utils/test/react';

vi.mock('@/utils/is-preview-env', () => ({
    isPreviewEnv: vi.fn(),
}));

// `next/dynamic` lazy-mounts the heavy `react-live-chat-loader` widget; replace it with a synchronous
// stub so the gate's render decision is observable without loading the real chunk (or its Suspense).
vi.mock('next/dynamic', () => ({
    default: () =>
        function LiveChatWidgetStub({ intercom, color }: { intercom: string; color?: string }) {
            return <div data-testid="live-chat-widget" data-intercom={intercom} data-color={color ?? ''} />;
        },
}));

/**
 * Builds a minimal shop record for the live-chat gate, controlling only the fields it reads.
 *
 * @param intercom - The `thirdParty.intercom` value; `undefined` omits the key entirely.
 * @returns A shop record with a primary accent and the given intercom configuration.
 */
const makeShop = (intercom?: string): OnlineShop =>
    ({
        thirdParty: intercom === undefined ? {} : { intercom },
        design: {
            accents: [
                { type: 'primary', color: '#0a0a0a', foreground: '#fafafa' },
                { type: 'secondary', color: '#c8a36a', foreground: '#0a0a0a' },
            ],
        },
    }) as unknown as OnlineShop;

describe('components', () => {
    describe('resolveLiveChatProviderKey', () => {
        beforeEach(() => {
            vi.mocked(isPreviewEnv).mockReturnValue(false);
        });

        it('returns null when no intercom id is configured', () => {
            expect(resolveLiveChatProviderKey({ intercom: undefined, hostname: 'shop.example.com' })).toBeNull();
        });

        it('returns null for an empty intercom id', () => {
            expect(resolveLiveChatProviderKey({ intercom: '', hostname: 'shop.example.com' })).toBeNull();
        });

        it('returns null for a whitespace-only intercom id', () => {
            expect(resolveLiveChatProviderKey({ intercom: '   ', hostname: 'shop.example.com' })).toBeNull();
        });

        it('returns null on preview/staging environments even when an id is configured', () => {
            vi.mocked(isPreviewEnv).mockReturnValue(true);
            expect(resolveLiveChatProviderKey({ intercom: 'abc123', hostname: 'preview.shop.example.com' })).toBeNull();
        });

        it('returns null when the environment check is indeterminate (null hostname)', () => {
            vi.mocked(isPreviewEnv).mockReturnValue(null);
            // A `null` verdict means "production env, hostname unknown" — never a reason to suppress; but an
            // unconfigured id still must not render. Guards the falsy-vs-true distinction in the gate.
            expect(resolveLiveChatProviderKey({ intercom: '', hostname: undefined })).toBeNull();
        });

        it('returns the trimmed key on a production host when an id is configured', () => {
            expect(resolveLiveChatProviderKey({ intercom: '  abc123  ', hostname: 'shop.example.com' })).toBe('abc123');
        });

        it('forwards the hostname to the preview-environment check', () => {
            resolveLiveChatProviderKey({ intercom: 'abc123', hostname: 'preview.shop.example.com' });
            expect(isPreviewEnv).toHaveBeenCalledWith('preview.shop.example.com');
        });
    });

    describe('LiveChatProvider', () => {
        beforeEach(() => {
            vi.mocked(isPreviewEnv).mockReturnValue(false);
        });

        it('always renders its children', () => {
            const { getByText } = render(
                <LiveChatProvider shop={makeShop(undefined)} hostname="shop.example.com">
                    <p>storefront content</p>
                </LiveChatProvider>,
            );

            expect(getByText('storefront content')).toBeInTheDocument();
        });

        it('does not mount the widget when no intercom id is configured', () => {
            const { queryByTestId } = render(
                <LiveChatProvider shop={makeShop(undefined)} hostname="shop.example.com">
                    <p>storefront content</p>
                </LiveChatProvider>,
            );

            expect(queryByTestId('live-chat-widget')).not.toBeInTheDocument();
        });

        it('does not mount the widget for a blank (whitespace-only) intercom id', () => {
            const { queryByTestId } = render(
                <LiveChatProvider shop={makeShop('   ')} hostname="shop.example.com">
                    <p>storefront content</p>
                </LiveChatProvider>,
            );

            expect(queryByTestId('live-chat-widget')).not.toBeInTheDocument();
        });

        it('does not mount the widget on preview/staging environments', () => {
            vi.mocked(isPreviewEnv).mockReturnValue(true);

            const { queryByTestId } = render(
                <LiveChatProvider shop={makeShop('abc123')} hostname="preview.shop.example.com">
                    <p>storefront content</p>
                </LiveChatProvider>,
            );

            expect(queryByTestId('live-chat-widget')).not.toBeInTheDocument();
        });

        it('mounts the widget with the trimmed key and primary accent when configured on a production host', () => {
            const { getByTestId } = render(
                <LiveChatProvider shop={makeShop('  abc123  ')} hostname="shop.example.com">
                    <p>storefront content</p>
                </LiveChatProvider>,
            );

            const widget = getByTestId('live-chat-widget');
            expect(widget).toHaveAttribute('data-intercom', 'abc123');
            expect(widget).toHaveAttribute('data-color', '#0a0a0a');
        });
    });
});
