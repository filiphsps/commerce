/**
 * Article fixtures for the seeded demo tenant, ported from the Mongo seed
 * (the retired Mongo seed harness's `seed/fixtures/articles.ts`) into the Convex-native
 * `articles` table shape — same ten-article corpus, but every body is converted to
 * ProseMirror JSON through the real CMSRICH-04 codec via {@link prose}. Ten published
 * articles spanning a full year of publish dates, varied authors, varied tag sets, and
 * full rich-text bodies of differing length so feed renderers (chronological order, tag
 * filters, "more articles" rails) and individual article templates both have content.
 */

import type { Doc } from '../../../../convex/convex/_generated/dataModel';
import { heading, list, paragraph, prose } from './richtext';

/** The portion of an `articles` row the seed fixture supplies; `shop`/timestamps are stamped at insert. */
export type ArticleSeed = Omit<Doc<'articles'>, '_id' | '_creationTime' | 'shop' | 'createdAt' | 'updatedAt'>;

export const articleFixtures: ArticleSeed[] = [
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
        body: prose([
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
        body: prose([
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
        body: prose([
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
        body: prose([
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
    {
        slug: 'meet-the-makers-porto',
        title: 'Meet the makers — a week in Porto',
        author: 'Eira Lindqvist',
        publishedAt: '2025-07-12T08:00:00Z',
        excerpt:
            'A walk-through of the small Porto workshop that cuts and sews every Nordcom garment outside the wool range.',
        tags: ['behind-the-scenes', 'manufacturing', 'porto'],
        seo: {
            title: 'Meet the makers — a week in Porto — Nordcom Journal',
            description: 'How our Porto workshop pattern-makes, cuts, and finishes every non-wool garment by hand.',
        },
        body: prose([
            paragraph(
                'Porto is sometimes called “the second textile capital of Europe” by the kind of people who write about textile capitals. The first time we visited Atelier Mateus — the workshop that cuts and sews most of our range — they were ironing 200 hoodies by hand because the steam tunnel had broken that morning. We knew we were in the right place.',
            ),
            heading('The shop floor', 'h2'),
            paragraph(
                'Atelier Mateus is fourteen people, three pattern tables, two long cutting beds, and one well-loved Gerber plotter. They cut to order — no large speculative runs, no warehouse — which is how we keep our minimums small enough that experimental colourways are viable.',
            ),
            heading('What stays in Sweden, what goes south', 'h2'),
            paragraph(
                'Wool stays in Värmland — Klässbols and Borgs handle weaving and dyeing. Everything else (cotton hoodies, T-shirts, sweatpants, our small canvas range) is cut and sewn in Porto. Trims (buttons, zips, draw cords) are sourced within 300 km of the workshop.',
            ),
        ]),
    },
    {
        slug: 'the-recycled-down-story',
        title: 'Where our recycled down comes from',
        author: 'Eira Lindqvist',
        publishedAt: '2025-06-04T08:30:00Z',
        excerpt:
            'Bed-spread to puffer jacket, in five steps. A short tour of the Allied Feather + Down reclamation line.',
        tags: ['materials', 'sustainability', 'down'],
        seo: {
            title: 'Where our recycled down comes from — Nordcom Journal',
            description:
                'How discarded duvets become the fill in our puffers and parkas — five steps, one Californian sterilisation line.',
        },
        body: prose([
            paragraph(
                'We use 100% recycled down across our outerwear range. “Recycled” covers a wide spectrum — here is exactly what ours means.',
            ),
            heading('Five steps', 'h2'),
            list(
                [
                    'Collection — post-consumer bedding gathered by reclamation partners across the EU.',
                    'Sorting — clusters separated from feathers and shells.',
                    'Wash + sterilise — multi-stage cleaning to RDS Recycled Claim Standard.',
                    'Lofted + tested — fill power measured per ASTM D7612.',
                    'Shipped — to our Portuguese assembly partner for stuffing into baffles.',
                ],
                'number',
            ),
            heading('Why not virgin down?', 'h2'),
            paragraph(
                'Virgin down has a far lower climate footprint than synthetics. Recycled down is roughly half that of virgin, and removes the welfare question entirely. Until we trust live-plucking traceability further, recycled is where we will stay.',
            ),
        ]),
    },
    {
        slug: 'in-conversation-with-alma',
        title: 'In conversation with Alma Henriksson',
        author: 'Filip Sandström',
        publishedAt: '2025-05-19T09:00:00Z',
        excerpt: 'A long-form interview with the photographer who has shot every Nordcom campaign since 2021.',
        tags: ['interview', 'photography', 'editorial'],
        seo: {
            title: 'In conversation with Alma Henriksson — Nordcom Journal',
            description: 'A long-form interview with the photographer behind every Nordcom campaign since 2021.',
        },
        body: prose([
            paragraph(
                'Alma has shot every Nordcom campaign since 2021. We caught up with her at her Söder studio between two trips — a long-form conversation about working slowly, shooting medium-format film, and why she still does her own contact sheets.',
            ),
            heading('On working slowly', 'h3'),
            paragraph(
                '“The brief usually arrives a year before we shoot. We do not need three months of pre-production — the brief is doing the slowness for us. By the time we are on location everyone has had time to think.”',
            ),
            heading('On film', 'h3'),
            paragraph(
                '“I shoot Portra 400 on a Pentax 67. The waiting is the point — it forces an edit before the contact sheets even come back. By the time I see the frames I already know which six matter.”',
            ),
        ]),
    },
    {
        slug: 'on-modular-tailoring',
        title: 'On modular tailoring',
        author: 'Idun Vega',
        publishedAt: '2025-04-08T08:00:00Z',
        excerpt: 'How separates outperform suits over a five-year wardrobe horizon, and why we lead with the trouser.',
        tags: ['style-guide', 'tailoring'],
        seo: {
            title: 'On modular tailoring — Nordcom Journal',
            description: 'Why separates outperform suits over five years, and why we lead with the trouser.',
        },
        body: prose([
            paragraph(
                'Suits are a closed system: change the trouser and you have changed the suit. Separates are modular — and over a five-year wardrobe horizon, modular wins.',
            ),
            heading('Start with the trouser', 'h2'),
            paragraph(
                'The trouser is the piece that touches your body the most and gets the least camera time. Spend the money there first. A great trouser turns a £30 T-shirt into a complete outfit; a great jacket cannot save a mediocre trouser.',
            ),
        ]),
    },
    {
        slug: 'launch-spring-summer-26',
        title: 'SS26 is open — a first look',
        author: 'Filip Sandström',
        publishedAt: '2026-01-21T07:00:00Z',
        excerpt:
            'Our lightest collection yet. Twelve pieces, three core fabrics, and the first appearance of the Porto-cotton-canvas range.',
        tags: ['ss26', 'launch', 'editorial'],
        seo: {
            title: 'SS26 is open — Nordcom Journal',
            description: 'Twelve new pieces, three core fabrics, and a new Porto-cotton-canvas range.',
        },
        body: prose([
            paragraph(
                'SS26 went live this morning. It is our smallest seasonal drop — twelve pieces — and our most considered. After three years of working from a heavyweight palette we wanted to know what the workshop could do at the other end of the weight chart.',
            ),
            heading('Three fabrics', 'h2'),
            list([
                '180 g/m² Porto cotton canvas — the new anorak + tote range.',
                '160 g/m² long-staple jersey — T-shirts and the new dress.',
                '270 g/m² loopback — a lighter take on the Soft Cotton Hoodie.',
            ]),
        ]),
    },
    {
        slug: 'archive-sale-faq',
        title: 'Archive sale — your questions, our answers',
        author: 'Alma Henriksson',
        publishedAt: '2026-02-11T10:00:00Z',
        excerpt: 'Why the archive sale exists, what makes it in, and why some pieces are 70% off while others are 30%.',
        tags: ['archive', 'sales', 'company'],
        seo: {
            title: 'Archive sale FAQ — Nordcom Journal',
            description: 'Why the archive sale exists, what makes it in, and how we price the discounts.',
        },
        body: prose([
            paragraph(
                'Twice a year we do an archive sale — past-season pieces, sample-run runs, and the odd customer return that came back in better shape than it left. Some questions keep coming up, so this article tries to answer them once.',
            ),
            heading('Why bother with returns?', 'h3'),
            paragraph(
                'A garment returned within the 30-day window almost always has nothing wrong with it — it did not fit or it did not suit. Throwing it out would be a waste; putting it back into the main range would be misleading. The archive is the honest middle.',
            ),
            heading('Why is some of it not very discounted?', 'h3'),
            paragraph(
                'Because not everything in the archive is old. The deepest discounts are on pieces from collections two or more seasons back. The shallower discounts are on current-season returns.',
            ),
        ]),
    },
];
