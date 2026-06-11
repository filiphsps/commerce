import type { Access } from 'payload';

/**
 * Payload access predicate that refuses EVERY caller — wired as `create`/`update`/`delete` on the
 * collections whose authoring has cut over to the Convex-native editor (CUTOVER-04: `header` +
 * `pages`; later cohorts adopt it as they flip). The collection stays registered so Payload still
 * boots for the not-yet-flipped cohorts and the read path keeps serving the inert Mongo snapshot
 * (the storefront's emergency-shadow leg, the pre-teardown dashboard listings), but the REST/local
 * write surface is dead: any write that lands here would silently fork content away from the
 * Convex authority. Harness seeds are unaffected — they write with `overrideAccess: true`, which
 * bypasses access predicates by Payload contract (and the seeded rows are inert for the cohort
 * until TEARDOWN-03 deletes the seed machinery).
 *
 * @returns Always `false`.
 */
export const convexCutoverLocked: Access = () => false;
