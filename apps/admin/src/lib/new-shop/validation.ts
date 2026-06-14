/** Language-REGION locale shape, e.g. `en-US`. */
const LOCALE_PATTERN = /^[a-z]{2}-[A-Z]{2}$/;

/** Dot-separated hostname labels (letters/digits/hyphen, no leading/trailing hyphen), ≥2 labels. */
const HOSTNAME_PATTERN = /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))+$/;

/**
 * Reduces operator input to a bare hostname: trims, lowercases, and strips any scheme, path, and
 * port so `https://Shop.Acme.com:443/x` and `shop.acme.com` normalize to one routable key — the same
 * form stored on `shop.domain` and indexed in `shopDomains`.
 *
 * @param input - Raw hostname/URL text from the form.
 * @returns The normalized bare hostname.
 */
export function normalizeHostname(input: string): string {
    return input
        .trim()
        .toLowerCase()
        .replace(/^https?:\/\//, '')
        .replace(/\/.*$/, '')
        .replace(/:\d+$/, '');
}

/**
 * Whether the (normalized) input is a routable multi-label hostname — no scheme, port, or path, and
 * at least one dot. Single labels like `localhost` are rejected because tenant routing keys on a real
 * public hostname.
 *
 * @param input - Raw hostname/URL text.
 * @returns `true` when the normalized value is a valid hostname.
 */
export function isValidHostname(input: string): boolean {
    return HOSTNAME_PATTERN.test(normalizeHostname(input));
}

/**
 * Whether the input matches the `xx-XX` language-REGION locale shape stored on `shop.i18n.defaultLocale`.
 *
 * @param input - Raw locale text.
 * @returns `true` when the trimmed value is a valid locale tag.
 */
export function isValidLocale(input: string): boolean {
    return LOCALE_PATTERN.test(input.trim());
}

/**
 * Picks a legible foreground (`#000000` / `#ffffff`) for a hex background by perceived luminance, so a
 * chosen accent always pairs with readable text in the stored `AccentToken.foreground`.
 *
 * @param hexColor - A `#rgb` or `#rrggbb` background color.
 * @returns `#000000` for light backgrounds, `#ffffff` for dark or unparseable input.
 */
export function readableForeground(hexColor: string): string {
    const hex = hexColor.trim().replace(/^#/, '');
    const full = hex.length === 3 ? hex.replace(/(.)/g, '$1$1') : hex;
    if (!/^[0-9a-fA-F]{6}$/.test(full)) {
        return '#ffffff';
    }
    const r = Number.parseInt(full.slice(0, 2), 16);
    const g = Number.parseInt(full.slice(2, 4), 16);
    const b = Number.parseInt(full.slice(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.6 ? '#000000' : '#ffffff';
}
