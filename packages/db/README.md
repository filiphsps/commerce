# `@nordcom/commerce-db`

Mongoose models and a typed service layer for the Nordcom Commerce data store.
This is the only package allowed to touch MongoDB; every other workspace consumer
imports the high-level services from here.

> **Server-only.** The package is marked `'server-only'` and connects to MongoDB at
> module load. Importing it from a client component or without `MONGODB_URI` in the
> environment will throw.

## Install

This package is a workspace package — consume it via `workspace:*`:

```jsonc
{
    "dependencies": {
        "@nordcom/commerce-db": "workspace:*"
    }
}
```

It is built with Vite to `dist/` and consumed by both apps and other packages. Run
`pnpm build:packages` from the repo root in a fresh checkout — apps depend on the
emitted `dist/`, not the source.

## Usage

```ts
import { Shop, User } from '@nordcom/commerce-db';

// Find a tenant by its public hostname (used in the storefront middleware).
const shop = await Shop.findByDomain('swedish-candy-store.com');

// Lookup a user by id.
const user = await User.find({ id: someId });

// Find every shop a given user can administer.
const shops = await Shop.findByCollaborator({ collaboratorId: user.id });
```

`Shop`, `User`, etc. are **service instances** — not Mongoose models. They wrap the
underlying model behind a uniform `find` / `create` / `update` API and add per-domain
helpers like `Shop.findByDomain` and `Shop.findByCollaborator`.

### Sensitive data

By default, sensitive fields (e.g. `collaborators`, provider tokens) are projected
**out** of `find` results. Opt in explicitly when you need them:

```ts
const shop = await Shop.findByDomain(domain, { sensitiveData: true });
```

Never expose the result of a `sensitiveData: true` call to client components.

## Models

| Model      | File                  | Description                                                                |
| ---------- | --------------------- | -------------------------------------------------------------------------- |
| `Shop`     | `src/models/shop.ts`  | A tenant. Holds domain, alternative domains, i18n config, integrations.    |
| `User`     | `src/models/user.ts`  | A human operator. Connected to one or more shops as a collaborator.        |
| `Session`  | `src/models/session.ts` | NextAuth session document (when using the Mongo session adapter).        |
| `Identity` | `src/models/identity.ts` | OAuth identity / provider account record.                               |
| `Review`   | `src/models/review.ts`| Product reviews (where shops opt in).                                      |

All models share the `BaseDocument` shape:

```ts
type BaseDocument = Omit<mongoose.Document, 'id'> & { id: string };
```

## Service layer

`Service<DocType, Model>` (`src/services/service.ts`) is the abstract base:

```ts
import type { Model } from 'mongoose';
import type { BaseDocument } from '../db';

export class Service<DocType extends BaseDocument, M extends typeof Model<DocType>> {
    create(input: Omit<DocType, keyof BaseDocument>): Promise<DocType>;
    find(args: { id: string;            count?: 1;   /* … */ }): Promise<DocType>;
    find(args: { filter?: QueryFilter;   count?: 1;   /* … */ }): Promise<DocType>;
    find(args: { filter?: QueryFilter;   count?: number; /* … */ }): Promise<DocType[]>;
    findById(id: string,                projection?, options?): Promise<DocType | null>;
    findOneAndUpdate(filter, update?,   options?): Promise<DocType | null>;
}
```

The `find` overload picks the return type from the arguments:

-   `id` or `count: 1` → returns a single `DocType`.
-   otherwise        → returns `DocType[]`.

`filter` and `projection` accept native Mongoose `QueryFilter` / `ProjectionType`.

Per-service helpers extend this with domain-specific lookups (e.g.
`ShopService.findByDomain`, `ShopService.findByCollaborator`).

## Connection

`src/db.ts` connects at module load:

```ts
import 'server-only';

const uri = process.env.MONGODB_URI;
if (!uri) throw new MissingEnvironmentVariableError('MONGODB_URI');

export const db = await mongoose.connect(uri, {
    autoCreate: true,
    autoIndex: true,
    bufferCommands: false,
});
```

This means:

-   **Tests need a real database.** There is no in-memory mock. The repo-level `pnpm
    test` requires `MONGODB_URI` to be set; see the root `README.md`.
-   **The first import does the work.** Subsequent imports reuse the same connection.
-   **Don't import this from a client component.** `'server-only'` will fail the build.

## Layout

```text
packages/db/
└── src/
    ├── db.ts                # Mongoose connection (runs at import time)
    ├── index.ts             # Public re-exports + shared utility types
    ├── @types/              # Module-augmentation declarations
    ├── models/              # Mongoose schemas + models
    │   ├── identity.ts
    │   ├── review.ts
    │   ├── session.ts
    │   ├── shop.ts
    │   ├── user.ts
    │   └── index.ts
    └── services/            # Service classes wrapping each model
        ├── service.ts       # Abstract base
        ├── identity.ts
        ├── review.ts
        ├── session.ts
        ├── shop.ts
        ├── user.ts
        └── index.ts
```

## Scripts

```bash
pnpm build       # tsc + vite build (emits to dist/)
pnpm typecheck   # tsc -noEmit
pnpm lint        # biome lint .
pnpm clean       # rm dist / .turbo / coverage / etc.
```

Tests for this package run from the repo root (`pnpm test`). The vitest environment
is Node and requires `MONGODB_URI`.

## Utility types

The package re-exports a few small helpers used across consumers:

```ts
type Nullable<T> = T | null;
type Optional<T extends Record<string, unknown>> = { [K in keyof T]?: Nullable<T[K]> };
type Identifiable = { handle: string };
type LimitFilters = { limit?: Nullable<number> }
                  | { first?: Nullable<number>; last?: Nullable<number> };
```
