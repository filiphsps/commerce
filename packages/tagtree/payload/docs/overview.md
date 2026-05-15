---
title: Overview
sidebar_position: 1
---

# @tagtree/payload

Payload CMS hook factory for [`@tagtree/core`](/docs/tagtree-core/overview/). Produces
`afterChange` + `afterDelete` collection hooks that fire schema-typed
cache invalidation when documents change.

For the canonical reference, see the
[README on GitHub](https://github.com/filiphsps/commerce/blob/master/packages/tagtree-payload/README.md).

## Draft-status guard

By default, `afterChange` only fires invalidation when `doc._status === 'published'`.
Without this gate, Payload's autosave cadence (every ~2 seconds for draft-enabled
collections) would burst-invalidate production cache on every keystroke. Drafts
are invisible to anonymous reads anyway.

Opt out via `gatePublishedDrafts: false` for globals (header, footer, etc.) where
every change is implicitly published. `afterDelete` always invalidates regardless
of status — deletions are unconditional cache-affecting events.

## Tenant + key resolution

- Tenant ID is extracted from `doc.tenant` (accepts string or `{ id: string }`).
- Doc key resolves in order: `slug` → `shopifyHandle` → `id` (string fallback).

## In this section

- **Overview** — this page
- **API** — auto-generated TypeDoc reference for the public surface
