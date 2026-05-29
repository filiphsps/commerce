import { FONT_FAMILIES, type FontFamilyKey, type ResolvedShopTheme } from '@nordcom/commerce-db';
// `next/font/google` fetches and self-hosts each imported family at BUILD time, so importing all 13
// allowlisted families pulls 13 font sets through the build regardless of which shops use them.
// Accepted trade-off: `next/font` forbids dynamically-named loaders, so a per-tenant family must be a
// static module-scope import, and the allowlist is the smallest set that lets any tenant pick any
// family with zero redeploy. Only the family applied to a given `<html>` is bundled/preloaded at
// request time, so the runtime cost is one family per response — the build-time fetch is the only
// overhead, and it is bounded by the allowlist size.
import {
    Inter,
    Lato,
    Lora,
    Merriweather,
    Montserrat,
    Nunito,
    Open_Sans,
    Playfair_Display,
    Poppins,
    Public_Sans,
    Roboto,
    Source_Serif_4,
    Work_Sans,
} from 'next/font/google';

/**
 * Structural shape of a `next/font` loader result that this module consumes. Avoids importing
 * Next's internal `NextFontWithVariable` type while still proving — via `satisfies` on the maps
 * below — that every allowlisted family resolves to a usable `className` (sets `font-family`) and
 * `variable` (sets the bound CSS custom property).
 */
type FontVariant = { readonly className: string; readonly variable: string };

/**
 * Platform-default body/heading family. Mirrors `THEME_DEFAULTS.typography` in `@nordcom/commerce-db`
 * and is the single family the storefront loaded before per-tenant theming, so a theme-less shop
 * resolves to exactly this loader and renders byte-identically.
 */
const DEFAULT_FONT_FAMILY = 'public-sans' satisfies FontFamilyKey;

/**
 * Body-slot `next/font` loader for the platform default. Bound to `--font-primary` with the exact
 * options the storefront used before theming, so the generated class hashes are unchanged and a
 * theme-less `<html>` is byte-identical. Re-used as the `public-sans` entry of {@link BODY_FONTS}.
 */
const primaryFont = Public_Sans({
    weight: 'variable',
    subsets: ['latin'],
    display: 'swap',
    variable: '--font-primary',
    preload: true,
});

// Body-slot loaders for every other allowlisted family, each bound to `--font-primary` so applying
// one swaps the page body font. `next/font` forbids dynamically-named loaders, so each family is a
// distinct module-scope call; only the family whose class is applied to `<html>` is bundled and
// preloaded per request. Non-variable families (Lato, Poppins) must declare explicit weights;
// every other family ships a variable axis.
const interBody = Inter({ weight: 'variable', subsets: ['latin'], display: 'swap', variable: '--font-primary' });
const robotoBody = Roboto({ weight: 'variable', subsets: ['latin'], display: 'swap', variable: '--font-primary' });
const openSansBody = Open_Sans({ weight: 'variable', subsets: ['latin'], display: 'swap', variable: '--font-primary' });
const latoBody = Lato({ weight: ['400', '700'], subsets: ['latin'], display: 'swap', variable: '--font-primary' });
const montserratBody = Montserrat({
    weight: 'variable',
    subsets: ['latin'],
    display: 'swap',
    variable: '--font-primary',
});
const poppinsBody = Poppins({
    weight: ['400', '700'],
    subsets: ['latin'],
    display: 'swap',
    variable: '--font-primary',
});
const nunitoBody = Nunito({ weight: 'variable', subsets: ['latin'], display: 'swap', variable: '--font-primary' });
const workSansBody = Work_Sans({ weight: 'variable', subsets: ['latin'], display: 'swap', variable: '--font-primary' });
const sourceSerifBody = Source_Serif_4({
    weight: 'variable',
    subsets: ['latin'],
    display: 'swap',
    variable: '--font-primary',
});
const loraBody = Lora({ weight: 'variable', subsets: ['latin'], display: 'swap', variable: '--font-primary' });
const playfairBody = Playfair_Display({
    weight: 'variable',
    subsets: ['latin'],
    display: 'swap',
    variable: '--font-primary',
});
const merriweatherBody = Merriweather({
    weight: 'variable',
    subsets: ['latin'],
    display: 'swap',
    variable: '--font-primary',
});

// Heading-slot loaders bound to `--font-heading`. A separate set is required because a `next/font`
// loader binds exactly one CSS variable name; the heading variable is only emitted when the heading
// family differs from the body family (see `resolveFontClassName`), so the semantic layer can fall
// `--font-heading` back to `--font-primary` when they match.
const publicSansHeading = Public_Sans({
    weight: 'variable',
    subsets: ['latin'],
    display: 'swap',
    variable: '--font-heading',
});
const interHeading = Inter({ weight: 'variable', subsets: ['latin'], display: 'swap', variable: '--font-heading' });
const robotoHeading = Roboto({ weight: 'variable', subsets: ['latin'], display: 'swap', variable: '--font-heading' });
const openSansHeading = Open_Sans({
    weight: 'variable',
    subsets: ['latin'],
    display: 'swap',
    variable: '--font-heading',
});
const latoHeading = Lato({ weight: ['400', '700'], subsets: ['latin'], display: 'swap', variable: '--font-heading' });
const montserratHeading = Montserrat({
    weight: 'variable',
    subsets: ['latin'],
    display: 'swap',
    variable: '--font-heading',
});
const poppinsHeading = Poppins({
    weight: ['400', '700'],
    subsets: ['latin'],
    display: 'swap',
    variable: '--font-heading',
});
const nunitoHeading = Nunito({ weight: 'variable', subsets: ['latin'], display: 'swap', variable: '--font-heading' });
const workSansHeading = Work_Sans({
    weight: 'variable',
    subsets: ['latin'],
    display: 'swap',
    variable: '--font-heading',
});
const sourceSerifHeading = Source_Serif_4({
    weight: 'variable',
    subsets: ['latin'],
    display: 'swap',
    variable: '--font-heading',
});
const loraHeading = Lora({ weight: 'variable', subsets: ['latin'], display: 'swap', variable: '--font-heading' });
const playfairHeading = Playfair_Display({
    weight: 'variable',
    subsets: ['latin'],
    display: 'swap',
    variable: '--font-heading',
});
const merriweatherHeading = Merriweather({
    weight: 'variable',
    subsets: ['latin'],
    display: 'swap',
    variable: '--font-heading',
});

/**
 * Body-slot loader for every allowlisted family, keyed by the `@nordcom/commerce-db` `FONT_FAMILIES`
 * slug. The `satisfies` clause forces this map to stay exhaustive as the allowlist grows. The
 * `public-sans` entry is the exact platform-default loader so the default path is byte-identical.
 */
const BODY_FONTS = {
    'public-sans': primaryFont,
    inter: interBody,
    roboto: robotoBody,
    'open-sans': openSansBody,
    lato: latoBody,
    montserrat: montserratBody,
    poppins: poppinsBody,
    nunito: nunitoBody,
    'work-sans': workSansBody,
    'source-serif-4': sourceSerifBody,
    lora: loraBody,
    'playfair-display': playfairBody,
    merriweather: merriweatherBody,
} satisfies Record<FontFamilyKey, FontVariant>;

/**
 * Heading-slot loader for every allowlisted family, keyed by the `FONT_FAMILIES` slug and bound to
 * `--font-heading`. Mirrors {@link BODY_FONTS}; the `satisfies` clause keeps both maps in lock-step
 * with the allowlist.
 */
const HEADING_FONTS = {
    'public-sans': publicSansHeading,
    inter: interHeading,
    roboto: robotoHeading,
    'open-sans': openSansHeading,
    lato: latoHeading,
    montserrat: montserratHeading,
    poppins: poppinsHeading,
    nunito: nunitoHeading,
    'work-sans': workSansHeading,
    'source-serif-4': sourceSerifHeading,
    lora: loraHeading,
    'playfair-display': playfairHeading,
    merriweather: merriweatherHeading,
} satisfies Record<FontFamilyKey, FontVariant>;

/**
 * Narrows an arbitrary resolved family value to a known {@link FONT_FAMILIES} key. `resolveTheme`
 * already narrows authored values, so this is a defensive backstop for stale or hand-edited records.
 *
 * @param value - The resolved `fontFamily` / `headingFamily` value to test.
 * @returns `true` when `value` is an allowlisted family slug.
 */
const isFontFamilyKey = (value: string): value is FontFamilyKey => Object.hasOwn(FONT_FAMILIES, value);

/**
 * Builds the `<html>` className that applies a shop's resolved body and heading fonts.
 *
 * The body font contributes both its `className` (sets `font-family`) and its `variable` (sets
 * `--font-primary`). The heading `variable` (`--font-heading`) is appended only when the heading
 * family differs from the body family, so a shop whose heading tracks its body emits nothing extra
 * and the semantic layer can fall `--font-heading` back to `--font-primary`. Unknown families fall
 * back to the platform default. A theme-less shop resolves to `public-sans` for both slots, so the
 * returned string is byte-identical to the storefront's pre-theming `<html>` font classes.
 *
 * @param typography - The resolved typography tokens from `resolveTheme(shop).typography`.
 * @returns A space-joined className string for the `<html>` element.
 */
export const resolveFontClassName = (typography: ResolvedShopTheme['typography']): string => {
    const bodyKey = isFontFamilyKey(typography.fontFamily) ? typography.fontFamily : DEFAULT_FONT_FAMILY;
    const headingKey = isFontFamilyKey(typography.headingFamily) ? typography.headingFamily : DEFAULT_FONT_FAMILY;

    const body = BODY_FONTS[bodyKey];
    const classes = [body.className, body.variable];

    if (headingKey !== bodyKey) {
        classes.push(HEADING_FONTS[headingKey].variable);
    }

    return classes.join(' ');
};
