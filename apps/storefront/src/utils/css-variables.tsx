import type { OnlineShop, ThemeBranding } from '@nordcom/commerce-db';
import { resolveTheme, serializeThemeToCssVars } from '@nordcom/commerce-db';
import { Error } from '@nordcom/commerce-errors';
import { trace } from '@opentelemetry/api';
import { colord, extend } from 'colord';
import a11yPlugin from 'colord/plugins/a11y';
import { notFound } from 'next/navigation';
import { Shop } from '@/api/_shop-loader';
import { ShopifyApiClient } from '@/api/shopify';
import { BrandApi } from '@/api/shopify/brand';
import { Locale } from '@/utils/locale';

extend([a11yPlugin]);

/**
 * Resolves the primary and secondary branding accent colors for a shop. Accent precedence is
 * `theme.colors.accents` (the tenant override) → `design.accents` → the Shopify Brand API, matching
 * the order {@link resolveTheme} encodes; the Brand API is only queried when no saved accents exist.
 *
 * @param options.domain - The shop's hostname, used to look up the shop when `shop` is omitted.
 * @param options.shop - Pre-fetched shop record; if provided, skips the DB lookup.
 * @returns The primary and secondary accent color objects, or `null` when neither shop accents nor Brand API data are available.
 */
export const getBrandingColors = async ({
    domain,
    shop,
}: {
    domain: string;
    shop?: OnlineShop;
}): Promise<ThemeBranding | null> => {
    try {
        if (!shop) {
            try {
                shop = await Shop.findByDomain(domain, { convert: true });
            } catch (error: unknown) {
                if (Error.isNotFound(error)) {
                    notFound();
                }

                throw error;
            }
        }

        const { commerceProvider } = shop;
        // `resolveTheme` resolves `theme.colors.accents → design.accents → []`, so reading the
        // resolved accents lets a tenant's `theme.colors.accents` override win over `design.accents`
        // before the Brand API fallback runs.
        const accents = resolveTheme(shop).colors.accents;

        if (accents.length <= 0) {
            try {
                if ((commerceProvider.type as string) === 'shopify') {
                    // `Locale.default` (en-US) is fine for English-first shops
                    // but silently mis-queries Swedish/German/etc. storefronts
                    // — the Brand query goes out `@inContext` of the wrong
                    // locale and Shopify either returns generic copy or 404s.
                    // Use the shop's configured default locale instead.
                    const api = await ShopifyApiClient({ shop, locale: Locale.fallbackForShop(shop) as Locale });
                    const brand = await BrandApi({ api });
                    if (!brand) return null;

                    const primary = brand.colors.primary[0];
                    const secondary = brand.colors.secondary[0];

                    if (primary.background && secondary.background) {
                        return {
                            primary: {
                                type: 'primary',
                                color: primary.background,
                                foreground: primary.foreground || '#000000',
                            },
                            secondary: {
                                type: 'secondary',
                                color: secondary.background,
                                foreground: secondary.foreground || '#000000',
                            },
                        };
                    }
                }
            } catch (error: unknown) {
                trace.getActiveSpan()?.addEvent('css_variables.brand_fetch_failed', {
                    'error.message': (error as Error)?.message ?? String(error),
                    'shop.domain': domain,
                });
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

        // A shop may carry only one accent type; without both the accent fan-out cannot run, so
        // fall back to no-branding rather than emitting an `undefined` accent.
        if (!primary || !secondary) {
            return null;
        }

        return {
            primary,
            secondary,
        };
    } catch {
        return null;
    }
};

/**
 * Renders a `<style>` block injecting a shop's tenant-specific theme tokens as CSS custom properties.
 *
 * This is a thin server wrapper: it loads the shop, resolves branding via {@link getBrandingColors}
 * and the theme via `resolveTheme`, then renders the `[cssVar, value]` pairs from the isomorphic
 * `serializeThemeToCssVars` (in `@nordcom/commerce-db`). That serializer owns the contract —
 * diff-from-default keyed off `THEME_DEFAULTS`, value sanitization, quoted-content wrapping, the
 * branding-gated page-chrome/accent emission, and the `colord` light/dark derivation — so SSR here
 * and the admin live-preview compute the same output byte-for-byte.
 *
 * All declarations sit in `:root`; the globals.css bases they override also live in `:root` (this
 * block is later in source order, so it wins at equal specificity), while the
 * `@media (min-width: 48em) html:root` step still wins over both for the responsive tokens.
 *
 * @param props.domain - The shop's hostname.
 * @param props.shop - Optional pre-fetched shop record; omit to trigger an automatic DB lookup by domain.
 * @returns A `<style>` element with the resolved theme variables, or `null` when no tenant overrides apply.
 * @throws Re-throws any non-not-found error raised while resolving the shop by domain.
 */
const CssVariablesProvider = async ({ domain, shop }: { domain: string; shop?: OnlineShop }) => {
    let resolvedShop = shop;
    if (!resolvedShop) {
        try {
            resolvedShop = await Shop.findByDomain(domain, { convert: true });
        } catch (error: unknown) {
            if (Error.isNotFound(error)) {
                notFound();
            }

            throw error;
        }
    }

    const branding = await getBrandingColors({ domain, shop: resolvedShop });
    const theme = resolveTheme(resolvedShop);

    // The serializer is the single isomorphic source of these declarations; SSR (here) and the admin
    // live-preview both consume its `[cssVar, value]` output so the preview matches the eventual
    // published render byte-for-byte. Empty-name pairs are blank-line / comment sentinels reproduced
    // verbatim for byte-stability.
    const pairs = serializeThemeToCssVars(theme, branding);
    if (pairs.length === 0) {
        return null;
    }

    const body = pairs
        .map(([name, value]) => {
            const text = name.length > 0 ? `${name}: ${value};` : value;
            return text.length > 0 ? `            ${text}` : '';
        })
        .join('\n');

    return (
        <style>{`
        :root {
${body}
        }
    `}</style>
    );
};

CssVariablesProvider.displayName = 'Nordcom.CssVariablesProvider';

export { CssVariablesProvider };
