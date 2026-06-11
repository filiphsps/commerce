/**
 * Multi-tenant isolation — WIRING test.
 *
 * The original version booted a real Payload instance, seeded two tenants and
 * a thousand documents, then drove `payload.find` to confirm reads couldn't
 * cross tenants. That re-verified two things at runtime:
 *   1. Our access predicates (`tenantScopedRead` / `tenantScopedWrite` / etc.)
 *      return the right `where` clause for each user shape.
 *   2. Payload + `@payloadcms/plugin-multi-tenant` apply that `where` clause
 *      correctly when running queries.
 *
 * #1 is now covered exhaustively in `access.test.ts` (pure unit tests over the
 * predicate inputs). #2 is library code — re-testing it costs ~10s of Payload
 * boot per run for no signal we control.
 *
 * What's left to pin here is the IDENTITY wiring: every tenant-scoped
 * collection's `access.read/update/delete` must reference our predicates by
 * reference, so if someone swaps in a more permissive function the test fails.
 */

import type { CollectionConfig } from 'payload';
import { describe, expect, it } from 'vitest';
import { allCollections } from '../collections';
import { businessData, footer, header } from '../collections/_globals';
import { articles } from '../collections/articles';
import { collectionMetadata } from '../collections/collection-metadata';
import { featureFlags } from '../collections/feature-flags';
import { media } from '../collections/media';
import { pages } from '../collections/pages';
import { productMetadata } from '../collections/product-metadata';
import { reviews } from '../collections/reviews';
import { shops } from '../collections/shops';
import { users } from '../collections/users';
import { convexCutoverLocked } from './convex-cutover-locked';
import { publishedOrAuthRead } from './published-or-auth-read';
import { tenantScopedRead } from './tenant-scoped-read';

// Since CUTOVER-06 EVERY registered collection is authored exclusively outside Payload (the
// Convex-native editor for content, the CMSGATE-02 pipeline for media, the db seam for
// shops/reviews/flags, the auth adapter surface for users), so the whole Payload write surface is
// locked shut while reads keep serving the inert Mongo snapshot. Collections whose read predicate
// is one of our shared named functions are identity-pinned; `feature-flags`/`shops`/`users` keep
// their inline authed/self read closures, which their own unit tests cover behaviorally (`null`
// here).
const cutoverLocked: ReadonlyArray<readonly [string, CollectionConfig, unknown]> = [
    ['pages', pages, tenantScopedRead],
    ['header', header, publishedOrAuthRead],
    ['articles', articles, tenantScopedRead],
    ['productMetadata', productMetadata, tenantScopedRead],
    ['collectionMetadata', collectionMetadata, tenantScopedRead],
    ['footer', footer, publishedOrAuthRead],
    ['businessData', businessData, publishedOrAuthRead],
    ['media', media, tenantScopedRead],
    ['reviews', reviews, tenantScopedRead],
    ['feature-flags', featureFlags, null],
    ['shops', shops, null],
    ['users', users, null],
] as const;

describe('multi-tenant isolation — predicate wiring', () => {
    it('covers every registered collection — a new collection cannot ship with an unpinned Payload write path', () => {
        expect(new Set(cutoverLocked.map(([slug]) => slug))).toEqual(
            new Set(allCollections.map((collection) => collection.slug)),
        );
    });

    describe.each(
        cutoverLocked,
    )('Convex-cutover collection (CUTOVER-04/05/06): %s', (_slug, collection, readPredicate) => {
        it('keeps its pre-cutover read predicate — the emergency-shadow leg and pre-teardown reads still work', () => {
            if (readPredicate === null) {
                // Inline read closure (authed-only or self-scoped) — pinned behaviorally by the
                // collection's own unit tests; here we only assert a read path still exists.
                expect(typeof collection.access?.read).toBe('function');
                return;
            }
            expect(collection.access?.read).toBe(readPredicate);
        });

        it('locks create/update/delete shut — no Payload write may fork the inert snapshot from Convex', () => {
            // Identity check: a swap back to a permissive write predicate fails this test.
            expect(collection.access?.create).toBe(convexCutoverLocked);
            expect(collection.access?.update).toBe(convexCutoverLocked);
            expect(collection.access?.delete).toBe(convexCutoverLocked);
        });

        it('unmounts the collection from any Payload admin UI surface', () => {
            expect(collection.admin?.hidden).toBe(true);
        });
    });
});
