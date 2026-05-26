# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Before exploring, read these

- **`CLAUDE.md`** at the repo root — sections `## Architecture (non-obvious only)` and `## Coding conventions` are the authoritative invariants for this repo.
- **`CONTEXT.md`** at the repo root if it exists — the domain glossary.
- **`.specs/<YYYY-MM-DD-kebab-slug>/`** — past `spec.md` / `plan.md` files are this repo's record of prior decisions. When working in an area, scan the spec folders whose slugs touch that surface.

This repo does **not** use ADRs. Don't create `docs/adr/`; don't suggest the user adopt them. Architectural invariants live in `CLAUDE.md`; per-feature decisions live in spec folders.

If `CONTEXT.md` doesn't exist, **proceed silently**. Don't flag its absence; don't suggest creating it upfront. The producer skill (`/grill-with-docs`) creates it lazily when terms actually get resolved.

## File structure

```
/
├── CLAUDE.md
├── CONTEXT.md                          ← glossary, optional
├── .specs/
│   ├── 2026-05-26-storefront-stale-times/
│   │   ├── spec.md
│   │   ├── plan.md
│   │   └── tasks.md
│   └── 2026-05-26-other-topic/
├── apps/
└── packages/
```

See `CLAUDE.md`'s `## Spec, plan & task paths` for the authoritative rule on which workflows write here and the required path shape.

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in `CONTEXT.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal — either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/grill-with-docs`).

## Flag conflicts with existing rules or specs

If your output contradicts a rule in `CLAUDE.md` or a prior `.specs/*/spec.md`, surface it explicitly rather than silently overriding:

> _Contradicts `CLAUDE.md` rule on tenant context — proposing X because…_
> _Contradicts `.specs/2026-05-26-storefront-stale-times/spec.md` decision on cache TTL — worth reopening because…_
