# Split errors into an OSS core and a private catalogue

The motive for "publish errors" is reuse — a standalone OSS package wants Nordcom's `CommerceError` base and plumbing. We will NOT publish `@nordcom/commerce-errors` as-is: its catalogue (`API_UNKNOWN_COMMERCE_PROVIDER`, `GENERIC_MISSING_CONVEX_BRIDGE`, `GENERIC_CONVEX_OPERATOR_TOKEN_MINT`, tenant-scope codes, Shopify GraphQL internals) is a map of platform internals with a near-zero external audience, and publishing it would leak architecture for no consumer benefit. It is currently `private: true` and changeset-ignored; the only public `@nordcom` surface is the cart packages.

Instead we split: extract the **generic machinery** — the base `CommerceError`, the kind/statusCode/help-url contract, and the `code → class` registry — as an OSS core; keep the **platform catalogue** private, registering its codes against the core.

## Sequencing

The OSS core *is* the registry from ADR 0002. "Consolidate to a derived registry" and "extract a publishable core" are the same refactor. Do the registry consolidation privately first, design the core/catalogue cleavage as part of it, let the API settle, then publish the core. Publishing before the refactor would freeze the temporary enum/switch API that ADR 0002 commits to changing — turning an internal cleanup into a breaking major with a migration guide for strangers.

## Consequences

- `next-build-notifier` stays dependency-free (ADR 0001) and does NOT consume the core. The base is for other OSS packages willing to take the dependency; this goal must not reintroduce a dependency into `next-build-notifier`.
- Publishing the core adds semver discipline and a support surface. Gate the publish on a real second consumer, not on consistency.
- The core needs a non-platform identity (name/scope) since it carries no commerce domain.
