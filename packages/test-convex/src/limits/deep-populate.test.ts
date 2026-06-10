import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { headerData } from '../seed/fixtures/header';
import {
    createOperatorClient,
    createServerClient,
    type LimitsTenant,
    type LiveConvex,
    provisionTenant,
    saveRef,
    singletonRef,
    stableStringify,
    startLiveConvex,
} from './live';

/**
 * HARNESS-10 deep-populate boundary suite — REAL local backend only. Round-trips the HARNESS-12
 * header mega-menu fixture, extended to the schema's full depth 6 (the fixture itself stops at the
 * five levels a real merchant IA uses), through the editor save path and back out the storefront
 * read path (`cms/read:singleton`), asserting the entire nav tree reassembles with no level dropped
 * or flattened — the failure mode a depth-limited populate would hide in the JS mock. Gated behind
 * `CONVEX_LIMITS_TESTS=1`; 300s boot hook, 120s per test (steady-state is seconds; the margin is the
 * suite's flake budget for slow CI runners).
 */
const limitsSuite = process.env.CONVEX_LIMITS_TESTS === '1' ? describe : describe.skip;

/** A header navigation node as stored in the document data: a link with optional children. */
type NavNode = {
    link?: unknown;
    description?: string;
    items?: NavNode[];
};

/**
 * Computes the maximum depth of a nav forest (a top-level item with no children counts as 1).
 *
 * @param nodes - The nav nodes at the current level.
 * @returns The deepest chain length reachable from `nodes`.
 */
function navDepth(nodes: readonly NavNode[] | undefined): number {
    if (!nodes || nodes.length === 0) {
        return 0;
    }
    return 1 + Math.max(...nodes.map((node) => navDepth(node.items)));
}

/**
 * Builds the depth-6 nav forest: the HARNESS-12 fixture's five-level mega-menu (deep-cloned, so the
 * shared fixture is never mutated) plus one explicit six-level chain exercising the schema's full
 * allowed depth.
 *
 * @returns The combined top-level items.
 */
function buildDepthSixItems(): NavNode[] {
    const fixtureItems = JSON.parse(JSON.stringify(headerData.items ?? [])) as NavNode[];
    const chainLeaf: NavNode = {
        link: {
            kind: 'external',
            label: 'Navy wool sweater',
            url: '/products/navy-wool-sweater/',
            openInNewTab: false,
        },
        description: 'Level-six leaf: the deepest node the header schema admits.',
    };
    const depthSixChain: NavNode = {
        link: { kind: 'external', label: 'Archive', url: '/collections/archive/', openInNewTab: false },
        items: [
            {
                link: { kind: 'external', label: 'Seasons', url: '/collections/archive/', openInNewTab: false },
                items: [
                    {
                        link: { kind: 'external', label: 'FW25', url: '/collections/archive/', openInNewTab: false },
                        items: [
                            {
                                link: {
                                    kind: 'external',
                                    label: 'Knits',
                                    url: '/collections/knits/',
                                    openInNewTab: false,
                                },
                                items: [
                                    {
                                        link: {
                                            kind: 'external',
                                            label: 'Wool sweaters',
                                            url: '/collections/knits/',
                                            openInNewTab: false,
                                        },
                                        items: [chainLeaf],
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
        ],
    };
    return [...fixtureItems, depthSixChain];
}

limitsSuite('deep-populate: depth-6 header nav reassembles through the real read path', () => {
    let live: LiveConvex;
    let tenant: LimitsTenant;

    beforeAll(async () => {
        live = await startLiveConvex();
        tenant = await provisionTenant(live);
    }, 300_000);

    afterAll(async () => {
        await live?.stop();
    }, 60_000);

    it('publishes the depth-6 header singleton and reads back the full tree, no level dropped', async () => {
        const items = buildDepthSixItems();
        expect(navDepth(items)).toBe(6);

        const header = {
            logoLink: headerData.logoLink,
            items,
            localeSwitcher: headerData.localeSwitcher,
            cta: headerData.cta,
        };
        await createOperatorClient(live).mutation(saveRef, {
            collection: 'header',
            data: header,
            status: 'published',
        });

        const read = (await createServerClient(live).query(singletonRef, {
            serverSecret: live.serverSecret,
            shopId: tenant.publicShopId,
            collection: 'header',
            locale: 'en-US',
        })) as Record<string, unknown> | null;

        expect(read).not.toBeNull();
        expect(read?._status).toBe('published');
        expect(read?.logoLink).toBe(headerData.logoLink);
        expect(stableStringify(read?.localeSwitcher)).toBe(stableStringify(headerData.localeSwitcher));
        expect(stableStringify(read?.cta)).toBe(stableStringify(headerData.cta));

        // The load-bearing assertion: the whole forest — every branch of the HARNESS-12 fixture
        // AND the grafted six-level chain — reassembles canonically byte-identical, and the
        // read-back tree still reaches depth 6 (nothing truncated at a populate horizon).
        const readItems = read?.items as NavNode[] | undefined;
        expect(navDepth(readItems)).toBe(6);
        expect(stableStringify(readItems)).toBe(stableStringify(items));
    }, 120_000);
});
