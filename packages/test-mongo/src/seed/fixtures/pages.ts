/**
 * Page fixtures for the seeded demo tenant. Five pages, each exercising a
 * different combination of blocks so storefront renderers and visual tests
 * have material to chew on:
 *
 *   /              — home, the full smörgåsbord (banner → collection →
 *                    media-grid → columns → overview → alert)
 *   /about/        — long-form story, mixed rich-text + media
 *   /sustainability/ — collapsible richText FAQ, vendors block
 *   /lookbook-fw25/  — media-heavy editorial (banner + media-grid + collection)
 *   /contact/      — alerts + columns + business details
 */

import { heading, lexicalDoc, list, paragraph } from './lexical';

const externalLink = (label: string, url: string): Record<string, unknown> => ({
    kind: 'external',
    label,
    url,
    openInNewTab: false,
});

export interface PageFixture {
    slug: string;
    title: string;
    blocks: Array<Record<string, unknown>>;
    seo?: Record<string, unknown>;
}

export const pageFixtures: PageFixture[] = [
    {
        // `homepage` is the canonical slug the storefront middleware rewrites
        // `/<locale>/` to. Anything else (e.g. `home`) renders as 404 because
        // there's nothing in the routing tree mapping the bare index to it.
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
                cta: externalLink('Shop the collection', '/collections/fw25/'),
                alignment: 'left',
            },
            {
                blockType: 'collection',
                handle: 'fw25-bestsellers',
                title: 'FW25 bestsellers',
                layout: 'grid',
                limit: 8,
            },
            {
                blockType: 'media-grid',
                itemType: 'image',
                columns: 3,
                items: [
                    {
                        caption: 'Outerwear',
                        link: externalLink('Shop outerwear', '/women/outerwear/'),
                    },
                    {
                        caption: 'Knitwear',
                        link: externalLink('Shop knitwear', '/women/knitwear/'),
                    },
                    {
                        caption: 'Tailoring',
                        link: externalLink('Shop tailoring', '/men/tailoring/'),
                    },
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
                                body: lexicalDoc([
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
            {
                blockType: 'overview',
                source: 'featured',
                title: 'Editor’s picks',
                limit: 6,
            },
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
                body: lexicalDoc([
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
                                body: lexicalDoc([
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
                                body: lexicalDoc([
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
                body: lexicalDoc([
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
                body: lexicalDoc([
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
                handle: 'fw25',
                title: 'Shop the collection',
                layout: 'grid',
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
                                body: lexicalDoc([
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
                                body: lexicalDoc([
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
                                body: lexicalDoc([
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
];
