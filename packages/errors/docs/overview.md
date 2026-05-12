---
title: Overview
sidebar_position: 1
---

# commerce-errors

A typed, code-tagged error hierarchy used everywhere in the Nordcom Commerce monorepo.
Every error has a stable `code` (so it can be matched safely across boundaries) and
a `help` URL that points at user-facing documentation.

For the canonical reference, see the [README on GitHub](https://github.com/filiphsps/commerce/blob/master/packages/errors/README.md).

## Why

Throwing strings or generic `Error` instances loses information at every hop. This
package gives the platform a shared vocabulary for failures:

- **Stable codes** like `API_UNKNOWN_SHOP_DOMAIN` survive serialization and can be
  matched by HTTP handlers, middleware, and tests.
- **Semantic subclasses** (`NotFoundError`, `InvalidHandleError`, `TooManyRequestsError`)
  let callers branch on the *kind* of failure without parsing strings.
- **HTTP-mapped `statusCode`** lets API routes turn any thrown error into the right
  response with a single `error.statusCode ?? 500`.
- **Self-documenting:** every error exposes a `help` URL pointing at
  `https://shops.nordcom.io/docs/errors/<code>/`.

## In this section

- **Overview** — this page
- **API Reference** — auto-generated from TypeScript source
