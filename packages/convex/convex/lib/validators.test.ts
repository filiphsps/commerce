import { validate } from 'convex-helpers/validators';
import { describe, expect, it } from 'vitest';

import { jsonValueValidator, resolvedShopThemeValidator, targetingRuleValidator } from './validators';

/**
 * Full `ResolvedShopTheme` fixture mirroring `THEME_DEFAULTS` from `@nordcom/commerce-db`, with the
 * `accents` array populated and all four optional accent shades set so every arm of
 * {@link resolvedShopThemeValidator} (required leaves, the discriminated accent token, and the optional
 * shades) is exercised by the round-trip.
 */
const fullTheme = {
    colors: {
        background: '#fefefe',
        foreground: '#101418',
        accents: [
            { type: 'primary', color: '#073b4c', foreground: '#ffffff' },
            { type: 'secondary', color: '#ef476f', foreground: '#ffffff' },
        ],
        accentPrimaryLight: '#0d5a73',
        accentPrimaryDark: '#042530',
        accentSecondaryLight: '#f47a98',
        accentSecondaryDark: '#c5183f',
        surface: { base: '#f3f3f3', raised: '#f5f5f5', sunken: '#d8d8d8' },
        text: { default: '#222222', muted: '#555555' },
        border: { default: '#ece6d4', strong: '#d8d8d8' },
        state: { sale: '#b51200', danger: '#a53d3a', success: '#3b9e2e', info: '#6dc0d5' },
        focusRing: 'var(--accent)',
        sectionDark: '#051821',
    },
    typography: {
        fontFamily: 'public-sans',
        headingFamily: 'public-sans',
        fontWeights: { normal: 400, medium: 500, semibold: 600, bold: 700 },
        scale: { xs: '0.75rem', sm: '0.875rem', base: '1rem', lg: '1.125rem', xl: '1.25rem' },
    },
    radii: {
        block: '0.75rem',
        blockLarge: '1rem',
        blockSmall: 'calc(var(--block-border-radius) * 0.75)',
        blockTiny: '0.325rem',
    },
    spacing: { blockPadding: '0.6rem', blockSpacer: '0.55rem' },
    elevation: {
        card: '0 1px 0 rgb(20 17 11 / 2%), 0 1px 2px rgb(20 17 11 / 4%)',
        cardHover: '0 1px 0 rgb(20 17 11 / 2%), 0 10px 24px -12px rgb(20 17 11 / 22%)',
        panel: '0 24px 60px -24px rgb(15 23 42 / 0.18), 0 8px 20px -8px rgb(15 23 42 / 0.08)',
    },
    productCard: {
        bg: '#ffffff',
        borderColor: '#ece6d4',
        borderWidth: '1px',
        radius: '12px',
        padding: '10px',
        gap: '8px',
        shadow: '0 1px 0 rgb(20 17 11 / 2%), 0 1px 2px rgb(20 17 11 / 4%)',
        shadowHover: '0 1px 0 rgb(20 17 11 / 2%), 0 10px 24px -12px rgb(20 17 11 / 22%)',
        minWidth: '200px',
        maxWidth: '240px',
        gridAlign: 'start',
        railEdgeStyle: 'fade',
        searchImageWidth: '72px',
        imageRadius: '8px',
        imagePadding: '12px',
        imageFit: 'cover',
        imageHoverSwap: 'on',
        imageSizes: '(max-width: 768px) 50vw, 240px',
        aspectVertical: '4 / 5',
        aspectHorizontal: '4 / 5',
        aspectHorizontalSquare: '1 / 1',
        aspectMicro: '1 / 1',
        vendorColor: '#6b6555',
        vendorSize: '11px',
        titleColor: '#14110b',
        titleSize: '14px',
        titleWeight: 600,
        titleLineClamp: 2,
        priceColor: '#14110b',
        priceSize: '15px',
        priceWeight: 700,
        compareColor: '#6b6555',
        urgencyColor: '#b54a2a',
        urgencyThreshold: 5,
        eyebrowTracking: '0.14em',
        swatchSize: '18px',
        swatchGap: '5px',
        swatchRingColor: '#14110b',
        swatchHitPadding: '6px',
        chipBg: '#ffffff',
        chipColor: '#14110b',
        chipBorder: '#ece6d4',
        chipActiveBg: '#14110b',
        chipActiveColor: '#ffffff',
        chipPaddingY: '6px',
        chipPaddingX: '10px',
        moreBg: '#f3eedc',
        moreColor: '#4a463b',
        moreSize: '11px',
        moreWeight: 600,
        moreMinSize: '24px',
        ctaBg: '#14110b',
        ctaColor: '#ffffff',
        ctaRadius: '8px',
        ctaPaddingY: '11px',
        ctaHeight: '36px',
        ctaPlacement: 'float-pill',
        ctaPillPosition: 'top-right',
        ctaPillLabel: '',
        ctaPillIcon: '+',
        ctaPillReveal: 'always',
        ctaInlineStyle: 'solid',
        fastPathDot: '#2f7d4a',
        fastPathSingleVariant: 'on',
        quickAddPresentation: 'auto',
        overlayBg: '#ffffff',
        overlayRadius: '12px',
        overlayBorderColor: '#ece6d4',
        overlayShadow: '0 12px 32px -8px rgb(20 17 11 / 25%)',
        overlayWidth: '260px',
        overlayMaxHeight: '320px',
        overlayPadding: '14px',
        oosOpacity: 0.7,
        oosImageSaturate: 0.85,
        motionEase: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
        motionFast: '80ms',
        motionBase: '160ms',
        motionPickerIn: '220ms',
        motionPickerOut: '180ms',
        motionHoverDuration: '200ms',
        motionHoverEase: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
        motionImageSwapDuration: '400ms',
        motionOverlayInDuration: '180ms',
        motionOverlayInEase: 'cubic-bezier(0.32, 0.72, 0, 1)',
        saleStyle: 'strike-only',
        saleStrikeColor: 'currentColor',
        saleStrikeAngle: '-8deg',
        saleStrikeExtend: '2px',
        saleCurrentColor: '#b54a2a',
        saleShowSavingsLine: 'off',
        saleBadgeStyle: 'default',
        saleBadgePosition: 'top-left',
        saleBadgeText: '−{n}%',
        saleBadgeMinDiscount: 11,
        saleBadgeAllowOverlap: false,
    },
    cartLine: {
        imageSize: '64px',
        imageRadius: '8px',
        gap: '12px',
        paddingY: '12px',
        dividerColor: '#ece6d4',
        variantStyle: 'swatch',
        showVendor: true,
        showSku: false,
    },
};

describe('resolvedShopThemeValidator', () => {
    it('round-trips a full ResolvedShopTheme fixture', () => {
        expect(validate(resolvedShopThemeValidator, fullTheme)).toBe(true);
    });

    it('round-trips a theme with the optional accent shades absent', () => {
        // Drop the four optional accent shades to prove they are optional on the validator.
        const { accentPrimaryLight, accentPrimaryDark, accentSecondaryLight, accentSecondaryDark, ...colors } =
            fullTheme.colors;
        expect(validate(resolvedShopThemeValidator, { ...fullTheme, colors })).toBe(true);
    });

    it('rejects an unknown key', () => {
        const withUnknown = { ...fullTheme, colors: { ...fullTheme.colors, neon: '#39ff14' } };
        expect(validate(resolvedShopThemeValidator, withUnknown)).toBe(false);
    });
});

describe('jsonValueValidator', () => {
    it('accepts the FeatureFlag Mixed defaultValue shapes', () => {
        for (const value of [
            'enabled',
            42,
            0.5,
            true,
            false,
            null,
            ['a', 1, true, null],
            { nested: { deep: [1, { flag: false }] }, list: [{ k: 'v' }] },
        ]) {
            expect(validate(jsonValueValidator, value)).toBe(true);
        }
    });

    it('rejects undefined, which JsonValue excludes', () => {
        expect(validate(jsonValueValidator, undefined)).toBe(false);
    });
});

describe('targetingRuleValidator', () => {
    it('accepts a TargetingRule with Mixed params and value', () => {
        const rule = {
            rule: 'shopDomain',
            params: { domain: 'acme.com', allow: ['a', 'b'], meta: { weight: 1 } },
            value: { variant: 'b', enabled: true },
            description: 'Route acme.com to variant b',
        };
        expect(validate(targetingRuleValidator, rule)).toBe(true);
    });

    it('accepts a TargetingRule without the optional description', () => {
        const rule = { rule: 'always', params: {}, value: true };
        expect(validate(targetingRuleValidator, rule)).toBe(true);
    });
});
