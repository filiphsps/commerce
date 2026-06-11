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
import { businessData, footer, header } from '../collections/_globals';
import { articles } from '../collections/articles';
import { collectionMetadata } from '../collections/collection-metadata';
import { media } from '../collections/media';
import { pages } from '../collections/pages';
import { productMetadata } from '../collections/product-metadata';
import { convexCutoverLocked } from './convex-cutover-locked';
import { publishedOrAuthRead } from './published-or-auth-read';
import { adminOnly, tenantScopedRead, tenantScopedWrite } from './tenant-scoped-read';

const tenantScopedContent: ReadonlyArray<readonly [string, CollectionConfig]> = [
    ['articles', articles],
    ['productMetadata', productMetadata],
    ['collectionMetadata', collectionMetadata],
    ['media', media],
] as const;

const globals: ReadonlyArray<readonly [string, CollectionConfig]> = [
    ['footer', footer],
    ['businessData', businessData],
] as const;

// The CUTOVER-04 gate cohort: authored exclusively in the Convex-native editor, so the
// Payload write surface is locked shut while reads keep serving the inert Mongo snapshot.
const cutoverLocked: ReadonlyArray<readonly [string, CollectionConfig, unknown]> = [
    ['pages', pages, tenantScopedRead],
    ['header', header, publishedOrAuthRead],
] as const;

describe('multi-tenant isolation — predicate wiring', () => {
    describe.each(tenantScopedContent)('tenant-scoped content collection: %s', (_slug, collection) => {
        it('read uses tenantScopedRead — the boundary that scopes anon reads to published and editor reads to their tenants', () => {
            // Identity check: a swap to a more permissive function fails this test.
            expect(collection.access?.read).toBe(tenantScopedRead);
        });

        it('create uses tenantScopedWrite — editor must belong to the target tenant', () => {
            expect(collection.access?.create).toBe(tenantScopedWrite);
        });

        it('update uses tenantScopedWrite — same boundary as create', () => {
            expect(collection.access?.update).toBe(tenantScopedWrite);
        });

        it('delete is admin-only — editors cannot destroy other-tenant content (or their own without admin oversight)', () => {
            expect(collection.access?.delete).toBe(adminOnly);
        });
    });

    describe.each(globals)('global collection: %s', (_slug, collection) => {
        // Globals use `publishedOrAuthRead` (not `tenantScopedRead`) because
        // every authed CMS user gets the unfiltered read — tenant scoping for
        // globals is handled by the multi-tenant plugin's `isGlobal` mode,
        // which auto-partitions on `tenant` server-side.
        it('read uses publishedOrAuthRead — autosave drafts cannot leak to anon visitors', () => {
            expect(collection.access?.read).toBe(publishedOrAuthRead);
        });

        it('create uses tenantScopedWrite', () => {
            expect(collection.access?.create).toBe(tenantScopedWrite);
        });

        it('update uses tenantScopedWrite', () => {
            expect(collection.access?.update).toBe(tenantScopedWrite);
        });

        it('delete is admin-only', () => {
            expect(collection.access?.delete).toBe(adminOnly);
        });
    });

    describe.each(cutoverLocked)('Convex-cutover collection (CUTOVER-04): %s', (_slug, collection, readPredicate) => {
        it('keeps its pre-cutover read predicate — the emergency-shadow leg and dashboard listings still read', () => {
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
