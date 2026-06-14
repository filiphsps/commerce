'use client';

import type { CommerceProviders } from '@nordcom/commerce-db';

import { ShopifyConnectForm } from './shopify/connect-form';
import type { ProviderUiEntry } from './types';

/**
 * UI registry mapping a commerce-provider id to how it presents and collects its connection in the
 * wizard. The connect step is registry-driven: it renders the selected provider's `ConnectForm` from
 * this map, so wiring a provider's connect UI is one entry here (plus its mapper in `PROVIDER_MAPPERS`).
 * Shopify is the only connectable provider today, so the wizard auto-selects `PROVIDER_ORDER[0]`; a
 * multi-provider picker (choosing among several) is a follow-up for when a second provider lands.
 */
export const COMMERCE_PROVIDERS: Partial<Record<CommerceProviders, ProviderUiEntry>> = {
    shopify: {
        id: 'shopify',
        label: 'Shopify',
        ConnectForm: ShopifyConnectForm,
    },
};

/**
 * Display order of connectable providers. The wizard auto-selects `PROVIDER_ORDER[0]` as the sole
 * provider today; this order becomes the picker sequence once a second provider makes one warranted.
 */
export const PROVIDER_ORDER: CommerceProviders[] = ['shopify'];
