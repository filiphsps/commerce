import type { IconOverrides } from './scripts/types';

// Overrides for auto-derived icon defaults.
// Slugs match the filenames in ./svgs/. Use Shopify's `acceptedCardBrands` and
// `supportedDigitalWallets` enum values (lowercased) for entries that should be
// reachable through `<PaymentIcon name>` with Shopify's exact return strings.
//
// Entries not listed here fall back to auto-derived defaults:
//   slug          = filename stem
//   componentName = PascalCase(slug)
//   title         = humanized slug
//   aliases       = []
export const overrides: IconOverrides = {
    // Populated in Task 17 once SVGs are moved into ./svgs/.
};
