import { describe, expect, it, vi } from 'vitest';

import { CssVariablesProvider } from '@/utils/css-variables';
import { render, waitFor } from '@/utils/test/react';

describe('utils', () => {
    describe('CssVariablesProvider', () => {
        vi.mock('@shopify/hydrogen-react', async () => {
            return {
                useCart: vi.fn().mockReturnValue({
                    status: 'idle'
                }),
                useShop: vi.fn().mockReturnValue({}),
                useShopifyCookies: vi.fn().mockReturnValue({})
            };
        });

        it('should render without crashing', async () => {
            const wrapper = render(await CssVariablesProvider({ domain: 'example.com' }));

            expect(() => wrapper.unmount()).not.toThrow();
        });

        it('should render with the correct styles', async () => {
            const { container, unmount } = render(await CssVariablesProvider({ domain: 'example.com' }));

            await waitFor(() => {
                expect(container.innerHTML).toContain('--color-accent-primary: #00ff00;');
                expect(container.innerHTML).toContain('--color-accent-primary-text: #000000;');
                expect(container.innerHTML).toContain('--color-accent-secondary: #0000ff;');
                expect(container.innerHTML).toContain('--color-accent-secondary-text: #ffffff;');
                expect(unmount).not.toThrow();
            });
        });

        it('should render with the correct styles when shop is provided', async () => {
            const { container, unmount } = render(
                await CssVariablesProvider({
                    domain: 'example.com',
                    shop: {
                        design: {
                            accents: [
                                {
                                    type: 'primary',
                                    color: '#00ff00',
                                    foreground: '#000000'
                                },
                                {
                                    type: 'secondary',
                                    color: '#0000ff',
                                    foreground: '#ffffff'
                                }
                            ]
                        }
                    } as any
                })
            );

            await waitFor(() => {
                expect(container.innerHTML).toContain('--color-accent-primary: #00ff00;');
                expect(container.innerHTML).toContain('--color-accent-primary-text: #000000;');
                expect(container.innerHTML).toContain('--color-accent-secondary: #0000ff;');
                expect(container.innerHTML).toContain('--color-accent-secondary-text: #ffffff;');
                expect(unmount).not.toThrow();
            });
        });
    });
});
