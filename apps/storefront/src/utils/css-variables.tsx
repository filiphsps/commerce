import type { OnlineShop } from '@nordcom/commerce-db';

import { findShopByDomainOverHttp } from '@/api/shop';
import { ShopifyApiClient } from '@/api/shopify';
import { BrandApi } from '@/api/shopify/brand';
import { Locale } from '@/utils/locale';
import { colord, extend } from 'colord';
import a11yPlugin from 'colord/plugins/a11y';

extend([a11yPlugin]);

// TODO: Generalize this
export const getBrandingColors = async ({ domain, shop }: { domain: string; shop?: OnlineShop }) => {
    try {
        shop = shop || (await findShopByDomainOverHttp(domain));

        const {
            design: { accents },
            commerceProvider
        } = shop;

        if (accents.length <= 0) {
            try {
                if ((commerceProvider.type as string) === 'shopify') {
                    const api = await ShopifyApiClient({ shop, locale: Locale.default });
                    const brand = await BrandApi({ api });

                    const primary = brand.colors.primary[0];
                    const secondary = brand.colors.secondary[0];

                    if (primary.background && secondary.background) {
                        return {
                            primary: {
                                type: 'primary',
                                color: primary.background!,
                                foreground: primary.foreground! || '#000000'
                            },
                            secondary: {
                                type: 'secondary',
                                color: secondary.background!,
                                foreground: secondary.foreground! || '#000000'
                            }
                        };
                    }
                }
            } catch (error: unknown) {
                console.error(error);
            }
        }

        if (accents.length <= 0) {
            return null;
        }

        // TODO: Deal with variants.
        const primary = accents
            .filter(({ type }) => type === 'primary')
            .sort((a, b) => (colord(a.color).luminance() < colord(b.color).luminance() ? -1 : 1))[0];
        const secondary = accents
            .filter(({ type }) => type === 'secondary')
            .sort((a, b) => (colord(a.color).luminance() < colord(b.color).luminance() ? -1 : 1))[0];

        return {
            primary,
            secondary
        };
    } catch {
        return null;
    }
};

const CssVariablesProvider = async ({ domain, shop }: { domain: string; shop?: OnlineShop }) => {
    const branding = await getBrandingColors({ domain, shop });
    if (!branding) {
        return null;
    }

    // TODO: Background and foreground colors.
    return (
        <style>{`
        :root {
            --color-background: #fefefe;
            --color-foreground: #101418;

            --color-accent-primary: ${branding.primary.color};
            --color-accent-primary-text: ${branding.primary.foreground};
            --color-accent-primary-light: ${colord(branding.primary.color).lighten(0.115).saturate(0.15).toHex()};
            --color-accent-primary-dark: ${colord(branding.primary.color).darken(0.05).toHex()};

            --color-accent-secondary: ${branding.secondary.color};
            --color-accent-secondary-text: ${branding.secondary.foreground};
            --color-accent-secondary-light: ${colord(branding.secondary.color).lighten(0.195).saturate(0.15).toHex()};
            --color-accent-secondary-dark: ${colord(branding.secondary.color).darken(0.15).toHex()};

            /* TODO: Remove these legacy variables. */
            --accent-primary: var(--color-accent-primary);
            --accent-primary-light: var(--color-accent-primary-light);
            --accent-primary-dark: var(--color-accent-primary-dark);
            --accent-secondary: var(--color-accent-secondary);
            --accent-secondary-light: var(--color-accent-secondary-light);
            --accent-secondary-dark: var(--color-accent-secondary-dark);
        }
    `}</style>
    );
};

CssVariablesProvider.displayName = 'Nordcom.CssVariablesProvider';
export { CssVariablesProvider };
