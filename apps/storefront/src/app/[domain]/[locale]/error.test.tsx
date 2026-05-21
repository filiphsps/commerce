import { describe, expect, it, vi } from 'vitest';
import { mockShop } from '@/utils/test/fixtures';
import { render, screen } from '@/utils/test/react';
import ErrorPage from './error';

// Mock only useOptionalShop; preserve ShopProvider (used by test/react.tsx wrapper).
vi.mock('@/components/shop/provider', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/components/shop/provider')>();
    return {
        ...actual,
        useOptionalShop: vi.fn(() => ({
            shop: mockShop({
                overrides: {
                    name: 'Test Shop',
                    design: {
                        header: { logo: { src: '/logo.png', alt: 'Test Shop logo', width: 125, height: 50 } },
                    },
                },
            }),
            currency: 'USD' as const,
            locale: { code: 'en-US' },
        })),
    };
});

const makeError = (message: string): Error & { digest?: string } =>
    Object.assign(new globalThis.Error(message), { digest: undefined });

describe('Error page', () => {
    it('renders shop logo when shop context is available', () => {
        render(<ErrorPage error={makeError('boom')} reset={() => undefined} />);
        const img = screen.getByRole('img', { name: /test shop/i });
        expect(img.getAttribute('src')).toBe('/logo.png');
    });

    it('renders shop name in error message when context is available', () => {
        render(<ErrorPage error={makeError('boom')} reset={() => undefined} />);
        expect(screen.getByText('Test Shop')).toBeTruthy();
    });

    it('falls back to generic copy when shop context is missing', async () => {
        const { useOptionalShop } = await import('@/components/shop/provider');
        vi.mocked(useOptionalShop).mockReturnValueOnce(null);

        render(<ErrorPage error={makeError('boom')} reset={() => undefined} />);
        expect(screen.getByText(/this shop/i)).toBeTruthy();
        expect(screen.queryByRole('img')).toBeNull();
    });
});
