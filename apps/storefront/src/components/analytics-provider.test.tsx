import type { OnlineShop } from '@nordcom/commerce-db';
import { describe, expect, it, vi } from 'vitest';
import { AnalyticsProvider } from '@/components/analytics-provider';
import { render } from '@/utils/test/react';

vi.mock('@next/third-parties/google', async () => {
    return {
        GoogleTagManager: () => null,
    };
});
vi.mock('@vercel/speed-insights/next', async () => {
    return {
        SpeedInsights: () => null,
    };
});
vi.mock('@vercel/analytics/react', async () => {
    return {
        Analytics: () => null,
    };
});
vi.mock('@/utils/trackable', async () => {
    return {
        Trackable:
            () =>
            ({ children }: any) => <>{children}</>,
    };
});

describe('components', () => {
    describe('AnalyticsProvider', () => {
        const shop: OnlineShop = {
            thirdParty: {
                googleTagManager: 'GTM-123456',
            },
        } as any;

        it('renders without crashing', async () => {
            const { unmount } = render(
                <AnalyticsProvider shop={shop}>
                    <h1>Test Component</h1>
                </AnalyticsProvider>,
            );

            expect(() => unmount()).not.toThrow();
        });
    });
});
