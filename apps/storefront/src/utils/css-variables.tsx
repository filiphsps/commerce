import type { OnlineShop, ResolvedProductCardTokens } from '@nordcom/commerce-db';
import { resolveTheme, THEME_DEFAULTS } from '@nordcom/commerce-db';
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
export const getBrandingColors = async ({ domain, shop }: { domain: string; shop?: OnlineShop }) => {
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

        return {
            primary,
            secondary,
        };
    } catch {
        return null;
    }
};

// Product-card knobs whose camelCase token name maps to the `--aspect-product-card-*` namespace
// rather than `--product-card-*` (see `ResolvedProductCardTokens` in `@nordcom/commerce-db`).
const PRODUCT_CARD_ASPECT_KEYS = new Set<keyof ResolvedProductCardTokens>([
    'aspectVertical',
    'aspectHorizontal',
    'aspectHorizontalSquare',
    'aspectMicro',
]);

// Knobs whose value is logical content (a CSS string literal), so it is wrapped in CSS quotes on
// emit — e.g. `imageSizes` and the CTA pill / sale-badge label content.
const PRODUCT_CARD_QUOTED_KEYS = new Set<keyof ResolvedProductCardTokens>([
    'imageSizes',
    'ctaPillLabel',
    'ctaPillIcon',
    'saleBadgeText',
]);

/**
 * Converts a camelCase token key to kebab-case for use in a CSS custom-property name.
 *
 * @param value - The camelCase key (e.g. `borderColor`).
 * @returns The kebab-case form (e.g. `border-color`).
 */
const kebabCase = (value: string): string => value.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);

/**
 * Maps a {@link ResolvedProductCardTokens} key to the CSS custom property it serializes to. Aspect
 * knobs target the `--aspect-product-card-*` namespace; every other knob targets `--product-card-*`.
 *
 * @param key - The resolved product-card token key.
 * @returns The CSS custom-property name (including the leading `--`).
 */
const productCardCustomProperty = (key: keyof ResolvedProductCardTokens): string => {
    if (PRODUCT_CARD_ASPECT_KEYS.has(key)) {
        return `--aspect-product-card-${kebabCase(key).replace(/^aspect-/, '')}`;
    }

    return `--product-card-${kebabCase(key)}`;
};

// Characters that could terminate a `:root` declaration, the rule, or the `<style>` element and let
// a tenant-authored token inject arbitrary CSS/markup. A value carrying any of them is rejected.
const UNSAFE_CSS_VALUE = /[;{}<>@]/;

/**
 * Guards a serialized token value against style-element-breakout injection. Theme tokens — brand
 * accents and the ~90 free-text product-card knobs — are authored by tenant admins, so a value
 * carrying a declaration, rule, comment, or element terminator could escape its declaration and
 * inject arbitrary CSS or markup. Such a value is rejected so the caller skips the declaration and
 * falls back to the platform default instead of emitting attacker-controlled content.
 *
 * @param value - The resolved token value (string or number).
 * @param quoted - Whether the value is emitted inside CSS quotes; quoted values additionally reject
 *   the quote and backslash so they cannot terminate or escape the CSS string.
 * @returns The safe value to interpolate, or `null` when the value must be skipped.
 */
const sanitizeCssValue = (value: string | number | boolean, quoted: boolean): string | null => {
    if (typeof value !== 'string') {
        return String(value);
    }

    if (UNSAFE_CSS_VALUE.test(value) || value.includes('*' + '/')) {
        return null;
    }

    if (quoted && (value.includes('"') || value.includes('\\'))) {
        return null;
    }

    return value;
};

/**
 * Serializes a shop's resolved product-card knobs to CSS declaration strings, emitting only the
 * knobs whose value differs from the platform default. A theme-less shop resolves every knob to its
 * default, so this returns `[]` and the static `:root` base in globals.css renders unchanged. Values
 * that fail {@link sanitizeCssValue} are skipped (fall back to the default) rather than emitted.
 *
 * @param resolved - The shop's resolved product-card token map.
 * @returns Declaration strings of the form `--product-card-foo: bar;` (no indentation).
 */
const serializeProductCardTokens = (resolved: ResolvedProductCardTokens): string[] => {
    const declarations: string[] = [];

    for (const key of Object.keys(THEME_DEFAULTS.productCard) as (keyof ResolvedProductCardTokens)[]) {
        const value = resolved[key];
        if (value === THEME_DEFAULTS.productCard[key]) {
            continue;
        }

        const quoted = PRODUCT_CARD_QUOTED_KEYS.has(key);
        const safe = sanitizeCssValue(value, quoted);
        if (safe === null) {
            continue;
        }

        declarations.push(`${productCardCustomProperty(key)}: ${quoted ? `"${safe}"` : safe};`);
    }

    return declarations;
};

/**
 * Appends a `--name: value;` declaration for every entry whose resolved value differs from its
 * platform default, mirroring the diff-from-default contract of {@link serializeProductCardTokens}.
 * A theme-less shop resolves every entry to its default, so nothing is appended and the static
 * globals.css base renders unchanged (byte-identical). Values that fail {@link sanitizeCssValue} are
 * skipped (fall back to the default).
 *
 * @param lines - The accumulating declaration buffer, mutated in place.
 * @param entries - `[cssVar, resolvedValue, defaultValue]` tuples for one or more token groups; each
 *   `cssVar` is the property components consume today (so the override takes effect immediately).
 * @returns Nothing; `lines` is mutated in place.
 */
const appendOverriddenTokens = (
    lines: string[],
    entries: ReadonlyArray<readonly [cssVar: string, value: string | number, defaultValue: string | number]>,
): void => {
    for (const [cssVar, value, defaultValue] of entries) {
        if (value === defaultValue) {
            continue;
        }

        const safe = sanitizeCssValue(value, false);
        if (safe === null) {
            continue;
        }

        lines.push(`${cssVar}: ${safe};`);
    }
};

/**
 * Appends a sanitized `--name: value;` declaration for every entry unconditionally. Used for the
 * groups master emitted whenever it rendered the branding `<style>` (page chrome and the accent
 * quartets), where omitting the default would change the no-`<style>` fallback rather than preserve
 * it. A value failing {@link sanitizeCssValue} is skipped, falling back to the globals.css default.
 *
 * @param lines - The accumulating declaration buffer, mutated in place.
 * @param entries - `[cssVar, value]` tuples to emit.
 * @returns Nothing; `lines` is mutated in place.
 */
const appendTokens = (
    lines: string[],
    entries: ReadonlyArray<readonly [cssVar: string, value: string | number]>,
): void => {
    for (const [cssVar, value] of entries) {
        const safe = sanitizeCssValue(value, false);
        if (safe !== null) {
            lines.push(`${cssVar}: ${safe};`);
        }
    }
};

/**
 * Renders a `<style>` block injecting a shop's tenant-specific theme tokens as CSS custom properties.
 *
 * Most token groups are emitted diff-from-default — only when the resolved value differs from
 * {@link THEME_DEFAULTS} — so a theme-less shop emits nothing the globals.css base does not already
 * provide and renders byte-identically. Each group targets the CSS custom property components consume
 * today, so a tenant edit takes effect immediately:
 * - Page chrome → `--color-background` / `--color-foreground`. These have NO globals.css base (the
 *   body rule falls back to `--color-bright` / `--color-dark` when unset). Master emitted them only
 *   inside the branding `<style>`, so to stay byte-identical they are emitted when branding resolves
 *   (their resolved value, defaulting to `#fefefe` / `#101418`); a no-branding shop emits them only
 *   when explicitly overridden, otherwise leaving the master fallback intact.
 * - Surface ramp → `--color-block` / `--color-block-light` / `--color-block-dark`; body text →
 *   `--color-dark` / `--color-dark-secondary`; state ramp → `--color-sale` / `--color-danger` /
 *   `--color-block-success` / `--color-block-info`. The P3-3 semantic aliases (`--surface-*`,
 *   `--text*`, `--state-*`) reference these legacy names, so overriding the legacy name flows
 *   through to the semantic layer for the P5 consumer migration.
 * - Border ramp (`--border-*`) and focus ring (`--focus-ring`) target the semantic names directly;
 *   they have no consumer until P5 migrates components onto the semantic layer, so a tenant edit is
 *   inert until then.
 * - Block radii / spacing (`--block-border-radius*`, `--block-padding`, `--block-spacer`) and the
 *   type scale / weights (`--text-*`, `--font-weight-*`, the latter Tailwind v4 theme vars) are
 *   consumed live throughout the storefront.
 * - Elevation → `--product-card-shadow` / `--product-card-shadow-hover` / `--header-panel-shadow`.
 *   The card shadows alias the product-card `shadow` / `shadowHover` knobs, which are emitted last
 *   and win on the rare collision where a shop sets both.
 * - Brand accents (and their `colord`-derived or theme-overridden light/dark shades) are emitted
 *   only when {@link getBrandingColors} resolves accents.
 * - Product-card knobs are emitted via {@link serializeProductCardTokens}.
 *
 * All declarations sit in `:root`; the globals.css bases they override also live in `:root` (the
 * serializer's block is later in source order, so it wins at equal specificity), while the
 * `@media (min-width: 48em) html:root` step still wins over both for the responsive tokens. Every
 * emitted value passes {@link sanitizeCssValue} so a tenant-authored token cannot break out of the
 * style element.
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

    const lines: string[] = [];

    const { colors, radii, spacing, elevation, typography } = theme;
    const d = THEME_DEFAULTS;

    // Page chrome has no globals.css base, so it cannot go through the diff-from-default path without
    // changing the no-branding fallback. Master emitted these literals only inside the branding
    // `<style>`: a branded shop got `#fefefe` / `#101418`, a no-branding shop got none (body falls
    // back to `--color-bright` / `--color-dark`). Preserve that exactly while honoring an override.
    if (branding) {
        appendTokens(lines, [
            ['--color-background', colors.background],
            ['--color-foreground', colors.foreground],
        ]);
    } else {
        appendOverriddenTokens(lines, [
            ['--color-background', colors.background, d.colors.background],
            ['--color-foreground', colors.foreground, d.colors.foreground],
        ]);
    }

    appendOverriddenTokens(lines, [
        // Surface ramp → `--color-block*` (semantic `--surface-*` alias these).
        ['--color-block', colors.surface.base, d.colors.surface.base],
        ['--color-block-light', colors.surface.raised, d.colors.surface.raised],
        ['--color-block-dark', colors.surface.sunken, d.colors.surface.sunken],

        // Body text ramp → `--color-dark*` (semantic `--text` / `--text-muted` alias these).
        ['--color-dark', colors.text.default, d.colors.text.default],
        ['--color-dark-secondary', colors.text.muted, d.colors.text.muted],

        // Border ramp → semantic `--border-*` (no legacy consumer; live once P5 migrates).
        ['--border-default', colors.border.default, d.colors.border.default],
        ['--border-strong', colors.border.strong, d.colors.border.strong],

        // State ramp → `--color-sale` / `--color-danger` / `--color-block-success` /
        // `--color-block-info` (semantic `--state-*` alias these; live once P5 migrates).
        ['--color-sale', colors.state.sale, d.colors.state.sale],
        ['--color-danger', colors.state.danger, d.colors.state.danger],
        ['--color-block-success', colors.state.success, d.colors.state.success],
        ['--color-block-info', colors.state.info, d.colors.state.info],

        // Focus ring → semantic `--focus-ring` (no consumer until P5; components use `--accent`).
        ['--focus-ring', colors.focusRing, d.colors.focusRing],

        // Block radii / spacing → consumed live throughout the storefront.
        ['--block-border-radius', radii.block, d.radii.block],
        ['--block-border-radius-large', radii.blockLarge, d.radii.blockLarge],
        ['--block-border-radius-small', radii.blockSmall, d.radii.blockSmall],
        ['--block-border-radius-tiny', radii.blockTiny, d.radii.blockTiny],
        ['--block-padding', spacing.blockPadding, d.spacing.blockPadding],
        ['--block-spacer', spacing.blockSpacer, d.spacing.blockSpacer],

        // Type scale / weights → Tailwind v4 theme vars consumed by `text-*` / `font-*` utilities.
        ['--text-xs', typography.scale.xs, d.typography.scale.xs],
        ['--text-sm', typography.scale.sm, d.typography.scale.sm],
        ['--text-base', typography.scale.base, d.typography.scale.base],
        ['--text-lg', typography.scale.lg, d.typography.scale.lg],
        ['--text-xl', typography.scale.xl, d.typography.scale.xl],
        ['--font-weight-normal', typography.fontWeights.normal, d.typography.fontWeights.normal],
        ['--font-weight-medium', typography.fontWeights.medium, d.typography.fontWeights.medium],
        ['--font-weight-semibold', typography.fontWeights.semibold, d.typography.fontWeights.semibold],
        ['--font-weight-bold', typography.fontWeights.bold, d.typography.fontWeights.bold],

        // Elevation → `--product-card-shadow*` / `--header-panel-shadow`. The card shadows overlap
        // the product-card knobs, emitted last so they win on the rare both-set collision.
        ['--product-card-shadow', elevation.card, d.elevation.card],
        ['--product-card-shadow-hover', elevation.cardHover, d.elevation.cardHover],
        ['--header-panel-shadow', elevation.panel, d.elevation.panel],
    ]);

    if (branding) {
        if (lines.length > 0) {
            lines.push('');
        }

        // The four shades default to a runtime `colord` derivation of the base accent, but a shop
        // may pin any of them via theme tokens.
        const primaryLight =
            theme.colors.accentPrimaryLight ?? colord(branding.primary.color).lighten(0.115).saturate(0.15).toHex();
        const primaryDark = theme.colors.accentPrimaryDark ?? colord(branding.primary.color).darken(0.05).toHex();
        const secondaryLight =
            theme.colors.accentSecondaryLight ?? colord(branding.secondary.color).lighten(0.195).saturate(0.15).toHex();
        const secondaryDark = theme.colors.accentSecondaryDark ?? colord(branding.secondary.color).darken(0.15).toHex();

        // Accents reach the markup from admin-authored `design.accents` or the Shopify Brand API, so
        // each value is sanitized; a malformed accent is skipped (the globals.css default applies).
        appendTokens(lines, [
            ['--color-accent-primary', branding.primary.color],
            ['--color-accent-primary-text', branding.primary.foreground],
            ['--color-accent-primary-light', primaryLight],
            ['--color-accent-primary-dark', primaryDark],
        ]);
        lines.push('');
        appendTokens(lines, [
            ['--color-accent-secondary', branding.secondary.color],
            ['--color-accent-secondary-text', branding.secondary.foreground],
            ['--color-accent-secondary-light', secondaryLight],
            ['--color-accent-secondary-dark', secondaryDark],
        ]);

        lines.push(
            '',
            '/* Legacy accent aliases, kept until consumers migrate to --color-accent-*. */',
            '--accent-primary: var(--color-accent-primary);',
            '--accent-primary-light: var(--color-accent-primary-light);',
            '--accent-primary-dark: var(--color-accent-primary-dark);',
            '--accent-secondary: var(--color-accent-secondary);',
            '--accent-secondary-light: var(--color-accent-secondary-light);',
            '--accent-secondary-dark: var(--color-accent-secondary-dark);',
        );
    }

    const productCard = serializeProductCardTokens(theme.productCard);
    if (productCard.length > 0) {
        if (lines.length > 0) {
            lines.push('');
        }
        lines.push(...productCard);
    }

    if (lines.length === 0) {
        return null;
    }

    const body = lines.map((line) => (line.length > 0 ? `            ${line}` : '')).join('\n');

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
