/**
 * Article fixtures for the seeded demo tenant. Four published articles
 * with full rich-text bodies, real authors, varied publish dates, and
 * realistic SEO metadata so feed renderers and individual-article
 * templates both have content.
 */

import { heading, lexicalDoc, list, paragraph } from './lexical';

export interface ArticleFixture {
    slug: string;
    title: string;
    author: string;
    publishedAt: string;
    excerpt: string;
    body: Record<string, unknown>;
    tags: string[];
    seo: Record<string, unknown>;
}

export const articleFixtures: ArticleFixture[] = [
    {
        slug: 'behind-the-fw25-lookbook',
        title: 'Behind the FW25 lookbook',
        author: 'Alma Henriksson',
        publishedAt: '2025-10-14T09:00:00Z',
        excerpt:
            'Four days, six looks, two ferries, and one stubborn ram. Notes from a week shooting the Fall/Winter 2025 collection in the Lofoten archipelago.',
        tags: ['lookbook', 'fw25', 'behind-the-scenes'],
        seo: {
            title: 'Behind the FW25 lookbook — Nordcom Journal',
            description:
                'Four days, six looks, two ferries, and one stubborn ram. Notes from a week shooting FW25 in Lofoten.',
            keywords: ['lookbook', 'fw25', 'lofoten', 'behind the scenes'],
        },
        body: lexicalDoc([
            paragraph(
                'We left Stockholm on the Monday before equinox. By Thursday morning we were on a rib boat off Reine, trying to keep a wool overcoat dry while the photographer figured out where the sun was supposed to be.',
            ),
            heading('Why Lofoten', 'h2'),
            paragraph(
                'The brief for FW25 was “light at the edge of darkness” — and the Lofoten archipelago is one of the few places in Europe where that brief reads literally as a weather forecast.',
            ),
            paragraph(
                'We wanted the collection to feel like it could survive the place we were shooting it in. Not in a heroic, expedition-marketing way; just in the everyday sense that a wool coat should still look good after a four-hour ferry ride and a thunderstorm.',
            ),
            heading('The looks', 'h2'),
            list([
                'Look 01 — The down parka (recycled-fill, polyamide shell).',
                'Look 02 — The wool overcoat (Värmland weave, horn buttons).',
                'Look 03 — The boucle jacket (deadstock yarn, raw-edge finish).',
                'Look 04 — The fisherman knit (worsted lambswool, hand-linked).',
                'Look 05 — The travel suit (mid-grey flannel, four-season weight).',
                'Look 06 — The waxed canvas anorak (organic cotton, beeswax finish).',
            ]),
            heading('Credits', 'h3'),
            paragraph(
                'Photography by Alma Henriksson. Styling by Idun Vega. Production by Eira Lindqvist. Many thanks to the harbour-master at Reine and to the ram, who eventually let us through.',
            ),
        ]),
    },
    {
        slug: 'sustainable-wool-sourcing',
        title: 'How we source our wool',
        author: 'Eira Lindqvist',
        publishedAt: '2025-09-02T08:00:00Z',
        excerpt:
            'Traceability is mostly a paperwork problem. Here is the paperwork — three mills, two countries, one breed of sheep.',
        tags: ['materials', 'sustainability', 'wool'],
        seo: {
            title: 'How we source our wool — Nordcom Journal',
            description:
                'A look at the three mills, two countries, and one breed of sheep behind our FW25 wool program.',
        },
        body: lexicalDoc([
            paragraph(
                'When people ask whether our wool is “sustainable,” the honest answer is: it depends what we are comparing it to. What we can tell you is where every fibre came from, who handled it, and what they got paid.',
            ),
            heading('The flock', 'h2'),
            paragraph(
                'All of our wool — without exception — comes from Klövsjö-bred sheep raised on six farms in Värmland and Jämtland. The farms are inspected annually under the KRAV organic standard.',
            ),
            heading('The mills', 'h2'),
            list([
                'Klässbols Linneväveri — combing and yarn spinning.',
                'Borgs Yllespinneri — dyeing and finishing.',
                'Tessuti del Lago di Como — heavyweight overcoating (the one exception to our Sweden-only rule).',
            ]),
            heading('The numbers', 'h2'),
            paragraph(
                'In FW25 we used 2.4 tonnes of greasy wool. Forty-one percent of it came from a single farm — Källsjö — that we have worked with since 2020. We pay them about 18% over the open-market rate; in exchange they keep us at the front of the queue when fleeces are scarce.',
            ),
        ]),
    },
    {
        slug: 'winter-layering-guide',
        title: 'A short guide to winter layering',
        author: 'Idun Vega',
        publishedAt: '2025-11-21T07:30:00Z',
        excerpt:
            'Three layers, one principle: each one should be useful by itself. If you only own the outer shell, you do not own a system.',
        tags: ['style-guide', 'layering', 'winter'],
        seo: {
            title: 'A short guide to winter layering — Nordcom Journal',
            description: 'Three layers, one principle. The simplest way to think about dressing for winter.',
        },
        body: lexicalDoc([
            paragraph(
                'There is a tendency, in outerwear marketing, to treat layering as a technology problem. It is not. It is a wardrobe problem, and the rule is simple: each layer should be useful on its own.',
            ),
            heading('Base', 'h2'),
            paragraph(
                'Wool, preferably merino. Long sleeve, slim-fitting, not tucked. The job of the base layer is to manage moisture; cotton holds onto sweat and will make you colder.',
            ),
            heading('Mid', 'h2'),
            paragraph(
                'This is the layer that does the work. A heavyweight fisherman knit or a brushed flannel shirt. It should be warm enough that you would happily wear it indoors.',
            ),
            heading('Outer', 'h2'),
            paragraph(
                'A coat that blocks wind and water. Not warmth — that is what the mid-layer is for. If you find yourself relying on a down parka to compensate for a thin sweater, you have skipped a step.',
            ),
            heading('A short rule', 'h3'),
            paragraph(
                'If your coat is the warmest thing you own, your system is upside down. Build the middle first and the outer layer becomes easier to choose.',
            ),
        ]),
    },
    {
        slug: 'repair-not-replace',
        title: 'Repair, not replace: our lifetime guarantee',
        author: 'Filip Sandström',
        publishedAt: '2025-08-09T10:00:00Z',
        excerpt:
            'What our repair guarantee actually covers, what it does not, and the postage we will pay for either way.',
        tags: ['repairs', 'company', 'sustainability'],
        seo: {
            title: 'Repair, not replace — Nordcom Journal',
            description:
                'What our lifetime repair guarantee covers, what it does not, and the postage we will pay for either way.',
        },
        body: lexicalDoc([
            paragraph(
                'Every garment we make comes with a lifetime repair guarantee. This article exists because “lifetime” is doing a lot of work in that sentence, and we would rather be clear about it.',
            ),
            heading('What we cover', 'h2'),
            list([
                'Seam repairs and reinforcements.',
                'Lining replacement.',
                'Zip and button replacement (matching the original where stocked).',
                'Re-waxing on the waxed-cotton range.',
                'Hem alterations within ±5 cm of the original length.',
            ]),
            heading('What we do not cover', 'h2'),
            list([
                'Damage caused by industrial cleaners or strong solvents.',
                'Alterations that change the silhouette of the garment.',
                'Items that have been altered or repaired by a third party in a way that prevents safe disassembly.',
            ]),
            heading('How it works', 'h2'),
            paragraph(
                'Email us a photo. We will send you a pre-paid label. Repairs are turned around within four weeks; you get tracking the whole way. We pay return postage either way — including when we cannot fix it and just send the garment back.',
            ),
        ]),
    },
];
