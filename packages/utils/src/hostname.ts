const DEV_TLDS = ['localhost', 'test'] as const;

export function stripPort(host: string): string {
    return host.split(':')[0] ?? '';
}

export function isDevHost(host: string | null | undefined): boolean {
    if (!host) {
        return false;
    }

    const hostname = stripPort(host).toLowerCase();
    return DEV_TLDS.some(
        (tld) =>
            hostname === tld ||
            (hostname.endsWith(`.${tld}`) && !hostname.startsWith('.')) ||
            hostname.endsWith('.storefront.localhost'), // Local development servers using portless.
    );
}

/**
 * Extract the shop slug or full prod domain from an HTTP host header.
 *
 * Dev TLDs (`.localhost`/`.test`): leftmost subdomain is the shop slug.
 *   `myshop.storefront.localhost:443` → `myshop`
 *   `storefront.localhost`            → ''  (bare app, no shop)
 * Production: returns the hostname unchanged, lower-cased.
 *   `shop.example.com` → `shop.example.com`
 *   `SHOP.example.com` → `shop.example.com`
 */
export function shopFromHost(host: string | null | undefined): string {
    if (!host) {
        return '';
    }

    const hostname = stripPort(host).toLowerCase();
    if (!isDevHost(hostname)) {
        return hostname;
    }

    return hostname.replace('.storefront.localhost', '');
}
