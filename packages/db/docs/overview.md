---
title: Overview
sidebar_position: 1
---

# commerce-db

Mongoose models and a typed service layer for the Nordcom Commerce data store.
This is the only package allowed to touch MongoDB; every other workspace consumer
imports the high-level services from here.

> **Server-only.** The package is marked `'server-only'` and connects to MongoDB at
> module load. Importing it from a client component or without `MONGODB_URI` in the
> environment will throw.

For the canonical reference, see the [README on GitHub](https://github.com/filiphsps/commerce/blob/master/packages/db/README.md).

## In this section

- **Overview** — this page
- **Services** — service classes (`Shop`, `User`, ...)
- **Models** — Mongoose schemas
- **API Reference** — auto-generated from TypeScript source
