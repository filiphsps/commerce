import type { Doc } from '../../../../convex/convex/_generated/dataModel';

/** The portion of a `businessData` row the seed fixture supplies; `shop`/timestamps are stamped at insert. */
export type BusinessDataSeed = Omit<Doc<'businessData'>, '_id' | '_creationTime' | 'shop' | 'createdAt' | 'updatedAt'>;

/**
 * Business-data fixture for the seeded demo tenant, ported verbatim from the Mongo seed
 * (the retired Mongo seed harness's `seed/fixtures/business-data.ts`) into the Convex-native
 * `businessData` table shape. Carries a complete mailing address and a handful of public
 * profiles so storefront SEO / structured-data renderers have real strings to interpolate.
 */
export const businessDataFixture: BusinessDataSeed = {
    legalName: 'Nordcom Demo Shop AB',
    supportEmail: 'hello@nordcom-demo-shop.example.com',
    supportPhone: '+46 8 555 010 10',
    address: {
        line1: 'Norrlandsgatan 12',
        line2: 'Floor 4',
        city: 'Stockholm',
        region: 'Stockholms län',
        postalCode: '111 43',
        country: 'Sweden',
    },
    profiles: [
        { platform: 'Instagram', handle: '@nordcom-demo', url: 'https://instagram.com/nordcom-demo' },
        { platform: 'TikTok', handle: '@nordcom-demo', url: 'https://tiktok.com/@nordcom-demo' },
        { platform: 'YouTube', handle: '@nordcom-demo', url: 'https://youtube.com/@nordcom-demo' },
        { platform: 'LinkedIn', handle: 'nordcom-demo', url: 'https://linkedin.com/company/nordcom-demo' },
    ],
};
