/**
 * Hostname utilities for resolving multi-tenant shop, app, and locale context.
 *
 * Multi-tenancy in this monorepo is hostname-driven: `<shop>.<app>.<tld>` in
 * dev (portless) and `<shop-hostname>` directly in prod. The helpers here
 * tokenize a host header into its parts so middleware never has to do string
 * surgery in line.
 *
 * Branded string types (`Hostname`, `ShopHandle`, `AppName`) make the parts
 * distinguishable at the type level — a `ShopHandle` cannot be silently used
 * where a `Hostname` is expected. The runtime values are still plain strings,
 * so existing callers that take/return `string` keep working without changes.
 *
 * Normalization rules applied throughout:
 *   1. Trim ASCII whitespace.
 *   2. Reject empty / leading-dot / all-whitespace input.
 *   3. Strip the port, IPv6-safe (`[::1]:8080` → `::1`, brackets removed).
 *   4. Strip a single trailing dot (FQDN form: `example.com.` → `example.com`).
 *   5. Lowercase ASCII. (IDN/punycode normalization is out of scope; callers
 *      that handle Unicode hostnames should encode upstream.)
 */

declare const HostnameBrand: unique symbol;
declare const ShopHandleBrand: unique symbol;
declare const AppNameBrand: unique symbol;

/** A normalized hostname: lowercased, port-stripped, no trailing dot. */
export type Hostname = string & { readonly [HostnameBrand]: true };

/** A shop identifier as stored on the `shops` collection — slug in dev, full hostname in prod. */
export type ShopHandle = string & { readonly [ShopHandleBrand]: true };

/** The app segment of a dev host — typically `storefront`, `admin`, or `landing`. */
export type AppName = string & { readonly [AppNameBrand]: true };

/** Top-level domains treated as local development. */
export const DEV_TLDS = ['localhost', 'test'] as const;
/**
 * The concrete type of `ParsedHost.tld` when `isDev` is `true`. Reach for it
 * when annotating a parameter or variable that must hold only a dev-environment
 * TLD value — for example, a helper that constructs dev URLs or a type guard
 * that narrows an unknown `string` to a known dev TLD.
 *
 * @example
 * ```ts
 * function isDevTld(tld: string): tld is DevTld {
 *     return DEV_TLDS.includes(tld as DevTld);
 * }
 * ```
 */
export type DevTld = (typeof DEV_TLDS)[number];

const DEV_TLD_SET: ReadonlySet<string> = new Set(DEV_TLDS);

// Hostname label per RFC 1123 (relaxed for the leading-digit allowance). We
// don't enforce the 63-char per-label limit since hostnames are user-input
// from `Host:` headers; the upstream HTTP stack already rejects malformed
// values. The point of this check is to reject obviously-bogus segments
// (empty, dot-only, control chars) before they reach the DB.
const HOSTNAME_LABEL = /^[a-z0-9](?:[a-z0-9-]{0,253}[a-z0-9])?$/;

/**
 * Remove the port suffix from a host string. IPv6-safe.
 *
 *   `my-shop.storefront.localhost:443` → `my-shop.storefront.localhost`
 *   `[::1]:8080`                      → `::1`
 *   `127.0.0.1`                       → `127.0.0.1`
 */
export function stripPort(host: string): string {
    if (!host) return '';

    // Bracketed IPv6: `[::1]` or `[::1]:8080`. Splitting on `:` would mangle
    // the address since IPv6 literals contain colons.
    if (host.startsWith('[')) {
        const closingBracket = host.indexOf(']');
        if (closingBracket === -1) {
            // Malformed — no closing bracket. Fall through to best-effort.
            return host.slice(1);
        }
        return host.slice(1, closingBracket);
    }

    // IPv4 / DNS: the port (if any) follows the last and only `:`. A bare
    // colon-bearing string with more than one colon is most likely an
    // unbracketed IPv6 — leave it intact so the caller can decide.
    const firstColon = host.indexOf(':');
    if (firstColon === -1) return host;
    if (host.indexOf(':', firstColon + 1) !== -1) return host;
    return host.slice(0, firstColon);
}

/**
 * Extract a numeric port from a host string, IPv6-safe.
 * Returns null when no port is present or it is not a valid integer.
 */
export function portFromHost(host: string | null | undefined): number | null {
    if (!host) return null;

    let portPart: string | undefined;
    if (host.startsWith('[')) {
        const closingBracket = host.indexOf(']');
        if (closingBracket === -1) return null;
        const after = host.slice(closingBracket + 1);
        if (!after.startsWith(':')) return null;
        portPart = after.slice(1);
    } else {
        const firstColon = host.indexOf(':');
        if (firstColon === -1) return null;
        // Unbracketed multi-colon → likely raw IPv6 with no port.
        if (host.indexOf(':', firstColon + 1) !== -1) return null;
        portPart = host.slice(firstColon + 1);
    }

    if (!portPart) return null;
    const port = Number(portPart);
    if (!Number.isInteger(port) || port < 0 || port > 65535) return null;
    return port;
}

/**
 * Normalize a host header to a canonical {@link Hostname} or `null` if the
 * input is empty / malformed / a leading-dot value.
 */
export function normalizeHost(host: string | null | undefined): Hostname | null {
    if (host == null) return null;

    const trimmed = host.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith('.')) return null;

    let value = stripPort(trimmed).toLowerCase();
    if (!value) return null;

    // FQDN form — drop a single trailing dot but reject double trailing dots.
    if (value.endsWith('.')) {
        value = value.slice(0, -1);
        if (value.endsWith('.')) return null;
    }

    if (!value) return null;
    return value as Hostname;
}

/** True when the host belongs to a development TLD (`.localhost`, `.test`). */
export function isDevHost(host: string | null | undefined): boolean {
    const normalized = normalizeHost(host);
    if (!normalized) return false;

    // Bare TLD — `localhost` or `test`.
    if (DEV_TLD_SET.has(normalized)) return true;

    // Subdomain of a dev TLD — last label is one of DEV_TLDS.
    const lastDot = normalized.lastIndexOf('.');
    if (lastDot === -1) return false;
    return DEV_TLD_SET.has(normalized.slice(lastDot + 1));
}

/** True when the host is the bare `localhost` (with or without port). */
export function isLocalhost(host: string | null | undefined): boolean {
    return normalizeHost(host) === ('localhost' as Hostname);
}

/** Structured breakdown of a host header. */
export interface ParsedHost {
    /** Fully normalized hostname (lowercased, port-stripped, no trailing dot). */
    hostname: Hostname;
    /** Port if present and valid, else null. */
    port: number | null;
    /** True when the hostname lives on a development TLD. */
    isDev: boolean;
    /** Dev TLD if `isDev`, else null. */
    tld: DevTld | null;
    /** Dev app segment (`storefront`, `admin`, `landing`, …) when present. */
    app: AppName | null;
    /** Shop slug (leftmost segment of a multi-segment dev host) when present. */
    shop: ShopHandle | null;
    /** Raw segment list, useful for callers that want to walk the labels. */
    segments: readonly string[];
}

/**
 * Tokenize a host header into its hostname/port/app/shop parts.
 *
 *   `my-shop.storefront.localhost:443`        → { hostname: 'my-shop.storefront.localhost',
 *                                                port: 443, isDev: true, tld: 'localhost',
 *                                                app: 'storefront', shop: 'my-shop',
 *                                                segments: ['my-shop','storefront','localhost'] }
 *   `demo.nordcom.store.storefront.localhost`   → { …, app: 'storefront', shop: 'demo.nordcom.store' }
 *   `storefront.localhost`                   → { …, app: 'storefront', shop: null }
 *   `localhost`                              → { …, app: null,         shop: null }
 *   `shop.example.com`                       → { …, isDev: false, tld: null, app: null, shop: null }
 *
 * Returns `null` when the input cannot be normalized (empty, leading dot,
 * etc.) so the caller can short-circuit before destructuring.
 */
export function parseHost(host: string | null | undefined): ParsedHost | null {
    const hostname = normalizeHost(host);
    if (!hostname) return null;

    const port = portFromHost(host);
    const segments = hostname.split('.');

    if (segments.some((seg) => seg === '' || !HOSTNAME_LABEL.test(seg))) {
        // Reject anything with empty or invalid labels (`a..b`, `--`, control chars).
        return null;
    }

    const lastSegment = segments[segments.length - 1] ?? '';
    const isDev = DEV_TLD_SET.has(lastSegment);

    if (!isDev) {
        return {
            hostname,
            port,
            isDev: false,
            tld: null,
            app: null,
            shop: null,
            segments,
        };
    }

    const tld = lastSegment as DevTld;
    // Dev shape: <shop>.<app>.<tld>. App is the segment immediately before
    // the TLD; shop is everything before `.<app>.<tld>` so that a shop with
    // a dotted handle in prod (e.g. `demo.nordcom.store`) round-trips through
    // the dev URL `demo.nordcom.store.storefront.localhost`.
    const app: AppName | null =
        segments.length >= 2 ? ((segments[segments.length - 2] ?? null) as AppName | null) : null;
    const shop: ShopHandle | null = segments.length >= 3 ? (segments.slice(0, -2).join('.') as ShopHandle) : null;

    return {
        hostname,
        port,
        isDev: true,
        tld,
        app,
        shop,
        segments,
    };
}

/**
 * Extract the shop identifier from an HTTP host header.
 *
 * Dev TLDs (`.localhost` / `.test`):
 *   `my-shop.storefront.localhost:443`         → `my-shop`
 *   `demo.nordcom.store.storefront.localhost`    → `demo.nordcom.store`   (dotted slug, mirrors prod)
 *   `my-shop.tenant.storefront.localhost`      → `my-shop.tenant`     (everything before .app.tld)
 *   `storefront.localhost`                    → ''                  (bare app, no shop)
 *   `localhost`                               → ''                  (bare TLD)
 *
 * Production:
 *   `shop.example.com`                        → `shop.example.com`
 *   `SHOP.example.com`                        → `shop.example.com`
 *   `shop.example.com.`                       → `shop.example.com` (trailing dot stripped)
 *
 * Returns `''` for empty / malformed / un-parseable input.
 */
export function shopFromHost(host: string | null | undefined): string {
    const parsed = parseHost(host);
    if (!parsed) return '';

    if (parsed.isDev) {
        return parsed.shop ?? '';
    }

    return parsed.hostname;
}

/**
 * Extract the app segment from a dev host header.
 *
 *   `my-shop.storefront.localhost` → `storefront`
 *   `storefront.localhost`        → `storefront`
 *   `localhost`                   → ''
 *   `shop.example.com`            → ''   (no app concept in prod)
 *
 * Returns `''` for empty / malformed / production / unparseable input.
 */
export function appFromHost(host: string | null | undefined): string {
    const parsed = parseHost(host);
    if (!parsed?.isDev) return '';
    return parsed.app ?? '';
}
