/**
 * Page fixtures for the seeded demo tenant, ported from the Mongo seed
 * (`@nordcom/commerce-test-mongo`'s `seed/fixtures/pages.ts`) into the Convex-native
 * `pages` table shape — same ten-page corpus, but every rich-text body is converted to
 * ProseMirror JSON through the real CMSRICH-04 codec via {@link prose}. Ten pages, each
 * exercising a different combination of blocks so storefront renderers and visual tests
 * have material to chew on:
 *
 *   /homepage/      — the full smörgåsbord: banner → collection → media-grid →
 *                     columns(richText + alert) → overview → alert
 *   /about/         — long-form story, mixed rich-text + media
 *   /sustainability/ — collapsible richText FAQ, vendors block
 *   /lookbook-fw25/  — media-heavy editorial (banner + media-grid + collection)
 *   /contact/        — alerts + columns + business details
 *   /shipping/       — collapsible FAQ + alerts + table-style rich-text
 *   /returns/        — alerts spanning every severity
 *   /size-guide/     — rich-text with measurement tables + media-grid (icons)
 *   /press/          — banner + 6-column media-grid + vendors
 *   /careers/        — 4-column layout + rich-text + alerts
 *
 * Blocks covered: alert (all 4 severities), banner (all 3 alignments),
 * collection (grid + carousel layouts), columns (1–4 column splits across
 * all widths), media-grid (image + icon, 1–6 columns), overview (all 3
 * sources), rich-text (plain + collapsible variants), vendors.
 */

import type { Doc } from '../../../../convex/convex/_generated/dataModel';
import { heading, list, paragraph, prose } from './richtext';

/** The portion of a `pages` row the seed fixture supplies; `shop`/timestamps are stamped at insert. */
export type PageSeed = Omit<Doc<'pages'>, '_id' | '_creationTime' | 'shop' | 'createdAt' | 'updatedAt'>;

/**
 * Builds the `external` link shape the link-field blocks embed.
 *
 * @param label - The visible link label.
 * @param url - The destination URL (trailing-slash internal path or absolute).
 * @returns The serialized link object.
 */
const externalLink = (label: string, url: string): Record<string, unknown> => ({
    kind: 'external',
    label,
    url,
    openInNewTab: false,
});

export const pageFixtures: PageSeed[] = [
    {
        slug: 'homepage',
        title: 'Nordcom Demo Shop',
        seo: {
            title: 'Nordcom Demo Shop — Considered staples for every season',
            description: 'Womenswear, menswear, and seasonal collections built to last. Free returns within 30 days.',
            keywords: ['nordcom', 'demo', 'fashion', 'commerce'],
        },
        blocks: [
            {
                blockType: 'banner',
                heading: 'Fall/Winter 2025',
                subheading: 'Made for the long Nordic dark — recycled down, organic wool, traceable leather.',
                cta: externalLink('Shop the collection', '/collections/featured/'),
                alignment: 'left',
            },
            {
                blockType: 'collection',
                handle: 'featured',
                title: 'Featured this week',
                layout: 'grid',
                limit: 8,
            },
            {
                blockType: 'media-grid',
                itemType: 'image',
                columns: 3,
                items: [
                    { caption: 'Womenswear', link: externalLink('Shop womenswear', '/collections/women/') },
                    { caption: 'Menswear', link: externalLink('Shop menswear', '/collections/men/') },
                    { caption: 'Shoes', link: externalLink('Shop shoes', '/collections/shoes/') },
                ],
            },
            {
                blockType: 'columns',
                columns: [
                    {
                        width: '2/3',
                        content: [
                            {
                                blockType: 'rich-text',
                                body: prose([
                                    heading('Built for the long term', 'h2'),
                                    paragraph(
                                        'Every garment we make is designed to outlast trends. Materials are traceable from fibre to finish; repairs are free for life.',
                                    ),
                                ]),
                            },
                        ],
                    },
                    {
                        width: '1/3',
                        content: [
                            {
                                blockType: 'alert',
                                severity: 'info',
                                title: 'Free returns within 30 days',
                                body: 'Try anything on at home. If it is not right, send it back at no cost.',
                                dismissible: false,
                            },
                        ],
                    },
                ],
            },
            { blockType: 'overview', source: 'featured', title: 'Editor’s picks', limit: 6 },
            {
                blockType: 'alert',
                severity: 'success',
                title: 'Carbon-neutral shipping is on us',
                body: 'All orders ship carbon-neutral by default — no surcharge, no opt-in.',
                dismissible: true,
            },
        ],
    },
    {
        slug: 'about',
        title: 'About Nordcom',
        seo: {
            title: 'About — Nordcom Demo Shop',
            description: 'A small Stockholm studio building clothing meant to be kept.',
        },
        blocks: [
            {
                blockType: 'banner',
                heading: 'Founded in Stockholm, 2018',
                subheading: 'A small studio building clothing meant to be kept — not replaced every season.',
                alignment: 'center',
            },
            {
                blockType: 'rich-text',
                body: prose([
                    heading('Our story', 'h2'),
                    paragraph(
                        'Nordcom began as a side project between two friends in a Vasastan apartment. Five collections later we still ship every order from the same neighbourhood, and we still answer every email ourselves.',
                    ),
                    paragraph(
                        'We design for longevity first, then everything else. That means heavyweight wool sourced from Värmland, leather tanned in Sweden, and a lifetime repair guarantee on anything we make.',
                    ),
                    heading('What we believe', 'h3'),
                    list([
                        'Build fewer, better pieces.',
                        'Pay our suppliers a living wage.',
                        'Repair before replacing.',
                        'Publish our material lists.',
                    ]),
                ]),
            },
            {
                blockType: 'media-grid',
                itemType: 'image',
                columns: 2,
                items: [
                    { caption: 'Our Stockholm studio' },
                    { caption: 'Wool spinning in Värmland' },
                    { caption: 'The Stockholm flagship' },
                    { caption: 'Hand-stitched details' },
                ],
            },
            {
                blockType: 'columns',
                columns: [
                    {
                        width: '1/2',
                        content: [
                            {
                                blockType: 'rich-text',
                                body: prose([
                                    heading('Visit us', 'h3'),
                                    paragraph('Norrlandsgatan 12, 4th floor. Open Tuesday to Saturday, 11–18.'),
                                ]),
                            },
                        ],
                    },
                    {
                        width: '1/2',
                        content: [
                            {
                                blockType: 'rich-text',
                                body: prose([
                                    heading('Work with us', 'h3'),
                                    paragraph(
                                        'We are a team of nine. Open roles are listed on /careers/ — we read every application.',
                                    ),
                                ]),
                            },
                        ],
                    },
                ],
            },
        ],
    },
    {
        slug: 'sustainability',
        title: 'Sustainability',
        seo: {
            title: 'Sustainability — Nordcom Demo Shop',
            description: 'Our materials, our suppliers, and our progress against the 2030 targets.',
        },
        blocks: [
            {
                blockType: 'banner',
                heading: 'Sustainability is a working document',
                subheading: 'We publish what we know, including what we have not solved yet.',
                alignment: 'left',
            },
            {
                blockType: 'rich-text',
                body: prose([
                    heading('2030 targets', 'h2'),
                    list(
                        [
                            '100% renewable energy across all owned facilities.',
                            '90% of materials traceable to fibre origin.',
                            'Zero virgin plastic in packaging.',
                            'Net-zero scope 1 + 2 emissions.',
                        ],
                        'number',
                    ),
                ]),
            },
            {
                blockType: 'rich-text',
                collapsible: true,
                collapsedByDefault: true,
                collapseLabel: 'Where are we today?',
                body: prose([
                    paragraph(
                        'As of FW25 we are at 71% renewable energy (Stockholm office and warehouse on green tariff; the Berlin pop-up is still on the local grid), 64% material traceability, and 38% recycled or compostable packaging by weight.',
                    ),
                    paragraph(
                        'The full breakdown — including the suppliers we have asked for changes and what they said back — is updated quarterly in our impact report.',
                    ),
                ]),
            },
            { blockType: 'vendors', title: 'Audited suppliers', maxVendors: 12 },
            {
                blockType: 'alert',
                severity: 'warning',
                title: 'Greenwashing is real',
                body: 'If something on this page reads like marketing rather than evidence, please tell us at hello@nordcom-demo-shop.example.com.',
                dismissible: false,
            },
        ],
    },
    {
        slug: 'lookbook-fw25',
        title: 'FW25 lookbook',
        seo: {
            title: 'FW25 lookbook — Nordcom Demo Shop',
            description: 'The full Fall/Winter 2025 collection, shot in the Lofoten archipelago.',
        },
        blocks: [
            {
                blockType: 'banner',
                heading: 'Fall/Winter 2025',
                subheading: 'Shot over four days in the Lofoten archipelago by Alma Henriksson.',
                alignment: 'center',
            },
            {
                blockType: 'media-grid',
                itemType: 'image',
                columns: 3,
                items: [
                    { caption: 'Look 01 — The down parka' },
                    { caption: 'Look 02 — The wool overcoat' },
                    { caption: 'Look 03 — The boucle jacket' },
                    { caption: 'Look 04 — The fisherman knit' },
                    { caption: 'Look 05 — The travel suit' },
                    { caption: 'Look 06 — The waxed canvas anorak' },
                ],
            },
            {
                blockType: 'collection',
                handle: 'featured',
                title: 'Shop the collection',
                layout: 'carousel',
                limit: 24,
            },
        ],
    },
    {
        slug: 'contact',
        title: 'Contact',
        seo: {
            title: 'Contact — Nordcom Demo Shop',
            description: 'How to reach us — email, phone, or in person at the Stockholm flagship.',
        },
        blocks: [
            {
                blockType: 'alert',
                severity: 'info',
                title: 'We aim to respond within one working day.',
                body: 'For order-specific questions please include your order number — it speeds things up.',
                dismissible: false,
            },
            {
                blockType: 'columns',
                columns: [
                    {
                        width: '1/3',
                        content: [
                            {
                                blockType: 'rich-text',
                                body: prose([
                                    heading('Email', 'h3'),
                                    paragraph('hello@nordcom-demo-shop.example.com'),
                                    heading('Phone', 'h3'),
                                    paragraph('+46 8 555 010 10 (Mon–Fri 09–17 CET)'),
                                ]),
                            },
                        ],
                    },
                    {
                        width: '1/3',
                        content: [
                            {
                                blockType: 'rich-text',
                                body: prose([
                                    heading('Stockholm flagship', 'h3'),
                                    paragraph('Norrlandsgatan 12, 4th floor'),
                                    paragraph('111 43 Stockholm, Sweden'),
                                    paragraph('Open Tuesday–Saturday, 11–18'),
                                ]),
                            },
                        ],
                    },
                    {
                        width: '1/3',
                        content: [
                            {
                                blockType: 'rich-text',
                                body: prose([
                                    heading('Press & partnerships', 'h3'),
                                    paragraph('press@nordcom-demo-shop.example.com'),
                                    paragraph('We read every pitch but cannot reply to all of them.'),
                                ]),
                            },
                        ],
                    },
                ],
            },
        ],
    },
    {
        slug: 'shipping',
        title: 'Shipping & delivery',
        seo: {
            title: 'Shipping — Nordcom Demo Shop',
            description: 'Lead times, carriers, customs, and how to track an order.',
        },
        blocks: [
            {
                blockType: 'banner',
                heading: 'Shipping & delivery',
                subheading: 'Carbon-neutral by default. 30-day window to change your mind.',
                alignment: 'right',
            },
            {
                blockType: 'alert',
                severity: 'info',
                title: 'Free shipping over €120',
                body: 'Domestic Sweden orders ship free over €60.',
                dismissible: false,
            },
            {
                blockType: 'rich-text',
                body: prose([
                    heading('Lead times', 'h2'),
                    list([
                        'Sweden: 1–2 working days (PostNord MyPack Collect).',
                        'Nordic countries: 2–4 working days (PostNord).',
                        'EU: 3–6 working days (DHL Express, GLS).',
                        'UK, US, Canada: 4–7 working days (DHL Express).',
                        'Rest of world: 6–10 working days (DHL Express). Duties pre-paid where supported.',
                    ]),
                ]),
            },
            {
                blockType: 'rich-text',
                collapsible: true,
                collapsedByDefault: true,
                collapseLabel: 'Customs, duties & VAT',
                body: prose([
                    paragraph(
                        'For EU destinations we ship DDP — VAT collected at checkout, no further charges on delivery. For UK + Switzerland orders we collect VAT at checkout but the carrier may still levy a handling fee. For US + rest of world we ship DAP — duties + taxes are the recipient’s responsibility unless explicitly noted.',
                    ),
                ]),
            },
            {
                blockType: 'rich-text',
                collapsible: true,
                collapsedByDefault: true,
                collapseLabel: 'Tracking an order',
                body: prose([
                    paragraph(
                        'You will receive a tracking email when the parcel leaves our warehouse. If 48 hours have passed since the order confirmation and you have not received tracking, drop us a line.',
                    ),
                ]),
            },
            {
                blockType: 'alert',
                severity: 'warning',
                title: 'Carrier delays during peak weeks',
                body: 'Black Friday → Christmas Eve and Lunar New Year typically add 1–3 working days. We will email you proactively if your order is impacted.',
                dismissible: false,
            },
        ],
    },
    {
        slug: 'returns',
        title: 'Returns & exchanges',
        seo: {
            title: 'Returns — Nordcom Demo Shop',
            description: 'How returns work — windows, condition, and refund timing.',
        },
        blocks: [
            {
                blockType: 'alert',
                severity: 'success',
                title: 'Free returns within 30 days',
                body: 'Pre-paid label included in every box, both directions.',
                dismissible: false,
            },
            {
                blockType: 'rich-text',
                body: prose([
                    heading('How returns work', 'h2'),
                    list(
                        [
                            'Drop the parcel at any PostNord access point with the included return label.',
                            'Once we receive it, allow 3 working days for inspection.',
                            'Refunds go back to your original payment method within 5–10 working days, depending on the issuer.',
                        ],
                        'number',
                    ),
                ]),
            },
            {
                blockType: 'alert',
                severity: 'warning',
                title: 'Items returned outside the window',
                body: 'Anything sent back after day 30 will be refused at our warehouse and returned to you at your cost. No exceptions, sorry.',
                dismissible: false,
            },
            {
                blockType: 'alert',
                severity: 'error',
                title: 'Items returned worn or laundered',
                body: 'Garments returned with visible wear, missing tags, or pet hair will not be refunded. We resell every returned piece into the archive sale; we cannot do that with damaged stock.',
                dismissible: false,
            },
            {
                blockType: 'rich-text',
                body: prose([
                    heading('Exchanges', 'h3'),
                    paragraph(
                        'Returning for a different size of the same product is treated as an exchange — your card is not re-charged unless the new size is at a different price.',
                    ),
                ]),
            },
        ],
    },
    {
        slug: 'size-guide',
        title: 'Size guide',
        seo: {
            title: 'Size guide — Nordcom Demo Shop',
            description: 'Body measurements + garment measurements for every category.',
        },
        blocks: [
            {
                blockType: 'banner',
                heading: 'Size guide',
                subheading: 'Measure once, order once. Free returns either way.',
                alignment: 'left',
            },
            {
                blockType: 'media-grid',
                itemType: 'icon',
                columns: 4,
                items: [{ caption: 'Tops' }, { caption: 'Bottoms' }, { caption: 'Outerwear' }, { caption: 'Shoes' }],
            },
            {
                blockType: 'rich-text',
                body: prose([
                    heading('How to measure', 'h2'),
                    list(
                        [
                            'Chest — measure around the fullest part, under the arms, with arms relaxed at sides.',
                            'Waist — measure around the narrowest part, just above the hip bones.',
                            'Hip — measure around the fullest part, with feet together.',
                            'Inseam — measure from crotch seam to the desired hem length.',
                        ],
                        'number',
                    ),
                ]),
            },
            {
                blockType: 'rich-text',
                collapsible: true,
                collapsedByDefault: false,
                collapseLabel: 'Tops (chest, cm)',
                body: prose([paragraph('XS — 86 / S — 91 / M — 97 / L — 104 / XL — 112 / XXL — 121')]),
            },
            {
                blockType: 'rich-text',
                collapsible: true,
                collapsedByDefault: true,
                collapseLabel: 'Bottoms (waist, cm)',
                body: prose([paragraph('28 — 71 / 30 — 76 / 32 — 81 / 34 — 86 / 36 — 91 / 38 — 96 / 40 — 102')]),
            },
            {
                blockType: 'rich-text',
                collapsible: true,
                collapsedByDefault: true,
                collapseLabel: 'Shoes (EU / UK / US — length, cm)',
                body: prose([
                    paragraph('36 / 3 / 5 — 22.8'),
                    paragraph('38 / 5 / 7 — 24.0'),
                    paragraph('40 / 6.5 / 8.5 — 25.5'),
                    paragraph('42 / 8 / 10 — 26.8'),
                    paragraph('44 / 9.5 / 11.5 — 28.0'),
                ]),
            },
        ],
    },
    {
        slug: 'press',
        title: 'Press',
        seo: {
            title: 'Press — Nordcom Demo Shop',
            description: 'Press releases, downloads, and where we have been written about.',
        },
        blocks: [
            {
                blockType: 'banner',
                heading: 'Press',
                subheading: 'Briefs, downloads, and contact for editorial.',
                alignment: 'center',
            },
            {
                blockType: 'media-grid',
                itemType: 'icon',
                columns: 6,
                items: [
                    { caption: 'Monocle' },
                    { caption: 'Acquired' },
                    { caption: 'Hypebeast' },
                    { caption: 'Highsnobiety' },
                    { caption: 'Wallpaper*' },
                    { caption: 'It’s Nice That' },
                ],
            },
            { blockType: 'vendors', title: 'Manufacturing partners', maxVendors: 8 },
            {
                blockType: 'rich-text',
                body: prose([
                    heading('Editorial contact', 'h3'),
                    paragraph('press@nordcom-demo-shop.example.com'),
                    paragraph(
                        'Brand book, hi-res photography, and the latest line sheet are available on request. We try to respond within two working days.',
                    ),
                ]),
            },
        ],
    },
    {
        slug: 'careers',
        title: 'Careers',
        seo: {
            title: 'Careers — Nordcom Demo Shop',
            description: 'Open roles, how we hire, and what it is like to work here.',
        },
        blocks: [
            {
                blockType: 'banner',
                heading: 'Build with us',
                subheading: 'Small team, considered briefs, lifetime employee discount.',
                alignment: 'left',
            },
            {
                blockType: 'columns',
                columns: [
                    {
                        width: 'auto',
                        content: [
                            {
                                blockType: 'rich-text',
                                body: prose([
                                    heading('Design', 'h3'),
                                    paragraph('Garment designer (full-time, Stockholm)'),
                                ]),
                            },
                        ],
                    },
                    {
                        width: 'auto',
                        content: [
                            {
                                blockType: 'rich-text',
                                body: prose([
                                    heading('Production', 'h3'),
                                    paragraph('Production planner (full-time, Porto)'),
                                ]),
                            },
                        ],
                    },
                    {
                        width: 'auto',
                        content: [
                            {
                                blockType: 'rich-text',
                                body: prose([
                                    heading('Engineering', 'h3'),
                                    paragraph('Senior storefront engineer (full-time, remote EU)'),
                                ]),
                            },
                        ],
                    },
                    {
                        width: 'auto',
                        content: [
                            {
                                blockType: 'rich-text',
                                body: prose([
                                    heading('Retail', 'h3'),
                                    paragraph('Sales associate (part-time, Stockholm flagship)'),
                                ]),
                            },
                        ],
                    },
                ],
            },
            {
                blockType: 'rich-text',
                body: prose([
                    heading('How we hire', 'h2'),
                    list(
                        [
                            'Application — a short cover letter and a portfolio link.',
                            'First call — 30 minutes with the hiring manager.',
                            'Practical — a paid take-home (or a craft critique for design roles).',
                            'Onsite — half a day with the team in Stockholm or Porto. Travel covered.',
                            'Offer — usually within a week of the onsite.',
                        ],
                        'number',
                    ),
                ]),
            },
            {
                blockType: 'alert',
                severity: 'info',
                title: 'We read every application',
                body: 'No keyword filters, no automated rejections. Expect a reply within ten working days even if it is a "no for now".',
                dismissible: false,
            },
        ],
    },
];
