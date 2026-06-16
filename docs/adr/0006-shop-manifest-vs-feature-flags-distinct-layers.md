# The shop extension manifest and feature flags are distinct layers

The **Shop extension manifest** and the **Feature flag** system are kept as two separate mechanisms with different jobs, not merged:

```
Shop extension manifest    operator-owned, coarse, per-shop. Enables/disables features, extensions,
                           and plugins at the shop level. The capability switch.
Feature flag               platform-owned, conditional. Rollout / targeting / experiments — percentage
                           buckets, cohort/auth/shop predicates, Vercel Toolbar overrides. The rollout layer.
```

A **Section**'s visibility surfaced the overlap: it is gated by both a `section:<id>` feature flag and a manifest `extensions.sections.<id>` override. They coexist — the manifest override wins and short-circuits the flag (`resolve.ts`), because the shop-level capability switch is authoritative and the flag is the rollout layer beneath it.

## Considered options

- **Fold section visibility (and the manifest) into the flag system.** Rejected: it conflates shop-level entitlement ("does this shop have this feature at all") with rollout/targeting ("to whom, and at what percentage"). The two are owned by different actors (operator vs platform) and change for different reasons.
- **Fold flags into the manifest.** Rejected: the manifest is a flat per-shop boolean/value bag; it cannot express percentage rollouts, cohort/auth targeting, or Vercel Toolbar overrides — all of which the flag system already provides via the Vercel Flags SDK.

## Consequences

- Section visibility has **two control surfaces**: the Customization hub's Sections tab (manifest) and the feature-flag admin (`section:<id>`). The manifest wins; document the precedence wherever either is edited.
- The manifest override **short-circuits** the flag — a per-shop pin defeats any platform rollout/targeting on that section. That is intended: an operator who has switched a section off (or on) at the shop level outranks a platform experiment.
- The `section:<id>` flag mechanism is **general** — keyed by arbitrary section id, not just chrome slots. Today only chrome slots (`info-bar` / `header` / `footer`) consume it; the export is forward-looking for data-driven page sections (e.g. `hero` / `promo`).
- A new knob belongs in the manifest when it is a shop-level on/off of a feature/extension/plugin; in a flag when it is a rollout, experiment, or audience-targeted toggle.
