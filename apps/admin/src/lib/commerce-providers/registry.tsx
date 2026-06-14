import type { CommerceProviders } from '@nordcom/commerce-db';

import { ShopifyConnectForm } from './shopify/connect-form';
import type { ProviderUiEntry } from './types';

/**
 * UI registry mapping a commerce-provider id to how it presents and collects its connection in the
 * wizard. Shopify is the only connectable provider today; adding another = one entry here plus its
 * mapper in `PROVIDER_MAPPERS`. The connect step renders purely from this registry, so new providers
 * need no wizard edits.
 */
export const COMMERCE_PROVIDERS: Partial<Record<CommerceProviders, ProviderUiEntry>> = {
    shopify: {
        id: 'shopify',
        label: 'Shopify',
        ConnectForm: ShopifyConnectForm,
    },
};

/** Display order of connectable providers in the wizard's provider picker. */
export const PROVIDER_ORDER: CommerceProviders[] = ['shopify'];
