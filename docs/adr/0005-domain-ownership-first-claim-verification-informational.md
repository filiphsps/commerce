# Domain ownership is first-claim; verification is informational

After creating a shop, an operator connects a customer-facing domain. Two questions — who owns a contested domain, and what verification means — resolve as follows.

## Ownership = first-claim, not verification

A domain's routing row is held by the first shop to claim it (`reconcileDomains`, a write-time invariant since Convex indexes are not unique). The **primary** `shop.domain` is a HARD invariant: a contested primary throws and rolls back the whole shop write, so there is never a silent split-brain where a shop is created but its primary domain serves the incumbent. A contested **alternative** domain is best-effort — it does not fail the write, but it is surfaced to the operator, never a silent `console.warn`. A never-verified `pending`/`failed` claim is reclaimable (operator release and/or TTL) so an honest owner is not permanently blocked by a stale or abandoned claim.

## Verification is informational and connectivity-only

`verifyDomain` checks that the domain points at the platform — the storefront Vercel project (when creds present) or `SERVICE_DOMAIN` via DNS-over-HTTPS — and flips the routing row `pending → verified | failed`. It NEVER gates routing (`findByDomain` ignores status). `*.localhost` auto-verifies; legacy rows read as verified; no data migration.

## Why not ownership-follows-verification

We considered making a verified claim reserve the namespace and reassigning the routing row to whoever verifies (the correct model for public self-serve signup). It is not implementable with the current check: a DNS/Vercel target proves the domain points at the SHARED platform, not at a specific tenant, so two shops pointing the same domain both verify identically. Sound verification-aware ownership would require a per-shop TXT ownership challenge (`_nordcom-verify.<domain>` = a per-shop token) as a separate arbiter, distinct from the connectivity record. Shop creation is operator-gated today (not public self-serve), so squatting is not the live threat and the first-claim + reclaim-valve model is sufficient. Revisit — add the TXT challenge + reassign-on-verify — if public self-serve shop signup lands.

## Consequences

- An unverified claim still reserves the namespace until released — acceptable under operator-gated creation; the reclaim valve covers the stale-claim case.
- The connectivity check (CNAME/A → a Vercel target or `SERVICE_DOMAIN`) must not be mistaken for proof of ownership.
- Implementation gaps as of this ADR: `reconcileDomains` currently SKIPS a contested primary silently (should throw + roll back); contested alternatives are `console.warn`'d (should be surfaced to the operator); no reclaim valve exists yet.
