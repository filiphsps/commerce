import { describe, expect, it, vi } from 'vitest';

import { CssVariablesProvider } from '@/utils/css-variables';
import { render } from '@/utils/test/react';

describe('utils', () => {
    describe('CssVariablesProvider', () => {
        vi.mock('@shopify/hydrogen-react', async () => {
            return {
                ...((await vi.importActual('@shopify/hydrogen-react')) || {}),
                useCart: vi.fn().mockReturnValue({
                    status: 'idle'
                }),
                useShop: vi.fn().mockReturnValue({}),
                useShopifyCookies: vi.fn().mockReturnValue({})
            };
        });

        vi.mock('@nordcom/commerce-database', () => ({
            ShopApi: vi.fn().mockResolvedValue({
                id: 'mock-shop-id',
                domains: 'staging.demo.nordcom.io',
                branding: {
                    brandColors: [
                        {
                            type: 'primary',
                            accent: '#00ff00',
                            foreground: '#000000',
                            background: '#ffffff'
                        },
                        {
                            type: 'secondary',
                            accent: '#0000ff',
                            foreground: '#ffffff',
                            background: '#000000'
                        }
                    ]
                },
                commerceProvider: {
                    type: 'shopify' as const,
                    domain: 'mock.shop' as const
                }
            })
        }));

        vi.mock('@nordcom/commerce-db', () => ({
            Shop: {
                findByDomain: vi.fn().mockResolvedValue({
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
                })
            }
        }));

        it('should render without crashing', async () => {
            const wrapper = render(await CssVariablesProvider({ domain: 'example.com' }));

            expect(() => wrapper.unmount()).not.toThrow();
        });

        it('should render with the correct styles', async () => {
            const wrapper = render(await CssVariablesProvider({ domain: 'example.com' }));

            expect(wrapper.container.innerHTML).toContain('--color-accent-primary: #00ff00;');
            expect(wrapper.container.innerHTML).toContain('--color-accent-primary-text: #000000;');

            expect(wrapper.container.innerHTML).toContain('--color-accent-secondary: #0000ff;');
            expect(wrapper.container.innerHTML).toContain('--color-accent-secondary-text: #ffffff;');
        });
    });
});
