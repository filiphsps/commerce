---
title: Getting Started
sidebar_position: 1
---

# Getting Started

Nordcom Commerce is a multi-tenant headless e-commerce platform. A single Next.js
deployment serves arbitrarily many shops resolved by hostname.

## Prerequisites

- Node.js `22.x` (see `.nvmrc`)
- pnpm `11.x`
- A running MongoDB instance

## Install

```bash
pnpm install
cp .env.example .env       # set MONGODB_URI, AUTH_SECRET, SERVICE_DOMAIN at minimum
pnpm build:packages        # apps depend on each package's dist/
pnpm dev                   # all three apps in parallel
```

| App        | URL                       |
| ---------- | ------------------------- |
| Storefront | http://localhost:1337     |
| Admin      | http://localhost:3000     |
| Landing    | http://localhost:3001     |
| Docs       | http://localhost:3002     |

See [Architecture](./architecture.md) for the multi-tenancy primer, and the
per-app guides under **Apps** for routing, data fetching, and CMS integration.
