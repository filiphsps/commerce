import type { Access } from 'payload';

/**
 * Payload access predicate that refuses EVERY caller — wired as `create`/`update`/`delete` on the
 * collections whose authoring has cut over to the Convex-native editor (CUTOVER-04: `header` +
 * `pages`; CUTOVER-05: `articles` + `productMetadata` + `collectionMetadata`; CUTOVER-06: every
 * remaining registered collection — `footer`, `businessData`, `reviews`, `feature-flags`, `media`,
 * `shops`, `users` — so NO Payload write path exists anymore). The collections stay registered so
 * Payload still boots (the read path keeps serving the inert Mongo snapshot for the storefront's
 * emergency-shadow leg and `payload-ctx`'s principal/tenancy reads), but the REST/local write
 * surface is dead: any write that lands here would silently fork content away from the Convex
 * authority. Harness seeds are unaffected — they write with `overrideAccess: true`, which bypasses
 * access predicates by Payload contract (and the seeded rows are inert until TEARDOWN-03 deletes
 * the seed machinery).
 *
 * @returns Always `false`.
 */
export const convexCutoverLocked: Access = () => false;
