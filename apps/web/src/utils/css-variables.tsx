import { ShopApi } from '@/api/shop';
import { colord } from 'colord';
import { unstable_cache as cache } from 'next/cache';

// TODO: Generalize this
export const getBrandingColors = async (domain: string) => {
    return cache(
        async (domain: string) => {
            const shop = await ShopApi(domain);
            const { colors } = shop.configuration!.design!.branding!;

            // TODO: Deal with variants.
            const primary = colors!.find(({ type }) => type === 'primary')!;
            const secondary = colors!.find(({ type }) => type === 'secondary')!;

            return {
                primary,
                secondary
            };
        },
        [domain, 'branding']
    )(domain);
};

const CssVariablesProvider = async ({ domain }: { domain: string }) => {
    const branding = await getBrandingColors(domain);

    // TODO: Background and foreground colors.
    return (
        <style suppressHydrationWarning={true}>{`
        :root {
            --color-background: #fefefe;
            --color-foreground: #101418;

            --color-accent-primary: ${branding.primary.accent};
            --color-accent-primary-text: ${branding.primary.foreground};
            --color-accent-primary-light: ${colord(branding.primary.accent).lighten(0.175).saturate(0.15).toHex()};
            --color-accent-primary-dark: ${colord(branding.primary.accent).darken(0.05).toHex()};

            --color-accent-secondary: ${branding.secondary.accent};
            --color-accent-secondary-text: ${branding.secondary.foreground};
            --color-accent-secondary-light: ${colord(branding.secondary.accent).lighten(0.15).toHex()};
            --color-accent-secondary-dark: ${colord(branding.secondary.accent).darken(0.15).toHex()};

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
