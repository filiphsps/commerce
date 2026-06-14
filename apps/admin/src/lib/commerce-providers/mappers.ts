import type { CommerceProviders } from '@nordcom/commerce-db';
import { UnknownCommerceProviderError } from '@nordcom/commerce-errors';

import { shopifyToCommerceProvider } from './shopify/mapper';
import type { ProviderMapper } from './types';

/**
 * Server-safe registry mapping a commerce-provider id to its `commerceProvider` builder. Deliberately
 * imports NO client components, so `createShop` can resolve a mapper without pulling the wizard's
 * `'use client'` connect forms into the server-action bundle. Adding a provider = one entry here plus
 * one in `COMMERCE_PROVIDERS` (the UI registry).
 */
export const PROVIDER_MAPPERS: Record<CommerceProviders, ProviderMapper> = {
    shopify: shopifyToCommerceProvider,
    // `stripe`'s schema arm carries no auth fields yet; it gains a mapper when that integration
    // matures. The wizard never offers it (PROVIDER_ORDER is shopify-only), so this is unreachable —
    // it throws a typed error (CLAUDE.md: never `new Error`) only as a defensive backstop.
    stripe: () => {
        throw new UnknownCommerceProviderError('stripe');
    },
};
