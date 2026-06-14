import 'server-only';

import { SHOPIFY_STOREFRONT_API_VERSION } from '@/lib/new-shop/defaults';
import { normalizeHostname } from '@/lib/new-shop/validation';

/** Result of probing a Shopify storefront with a public token. */
export type ShopifyPingResult = { ok: true; shopName: string } | { ok: false; error: string };

/**
 * Validates a Shopify Storefront API connection by issuing a minimal `{ shop { name } }` query with
 * the supplied public token. Runs server-side (the request carries a token and would be blocked by
 * CORS from the browser). Confirms the public-token half of the connection the storefront renders
 * with; the private token is stored but not independently pinged here.
 *
 * @param args.storeDomain - The `*.myshopify.com` store domain (any scheme/path is normalized off).
 * @param args.publicToken - The Storefront API public access token.
 * @returns `{ ok: true, shopName }` on success, otherwise `{ ok: false, error }` with a human message.
 */
export async function pingShopifyStorefront(args: {
    storeDomain: string;
    publicToken: string;
}): Promise<ShopifyPingResult> {
    const storeDomain = normalizeHostname(args.storeDomain);
    const publicToken = args.publicToken.trim();
    if (!storeDomain || !publicToken) {
        return { ok: false, error: 'Store domain and public token are both required.' };
    }

    const endpoint = `https://${storeDomain}/api/${SHOPIFY_STOREFRONT_API_VERSION}/graphql.json`;
    let response: Response;
    try {
        response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Shopify-Storefront-Access-Token': publicToken,
            },
            body: JSON.stringify({ query: '{ shop { name } }' }),
        });
    } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : 'Network error reaching Shopify.' };
    }

    if (!response.ok) {
        return { ok: false, error: `Shopify Storefront API returned HTTP ${response.status}.` };
    }

    const json = (await response.json()) as {
        data?: { shop?: { name?: string } };
        errors?: { message?: string }[];
    };
    if (json.errors?.length) {
        return { ok: false, error: json.errors[0]?.message ?? 'Shopify Storefront API error.' };
    }
    const name = json.data?.shop?.name;
    if (!name) {
        return { ok: false, error: 'Connected, but no shop was returned — check the token and its scope.' };
    }
    return { ok: true, shopName: name };
}
