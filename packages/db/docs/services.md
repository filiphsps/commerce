---
title: Services
sidebar_position: 2
---

# Service layer

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

- `id` or `count: 1` → returns a single `DocType`.
- otherwise        → returns `DocType[]`.

Per-service helpers extend this with domain-specific lookups (e.g.
`ShopService.findByDomain`, `ShopService.findByCollaborator`).

## Usage

```ts
import { Shop, User } from '@nordcom/commerce-db';

const shop = await Shop.findByDomain('swedish-candy-store.com');
const user = await User.find({ id: someId });
const shops = await Shop.findByCollaborator({ collaboratorId: user.id });
```

## Sensitive data

By default, sensitive fields (e.g. `collaborators`, provider tokens) are projected
**out** of `find` results. Opt in explicitly when you need them:

```ts
const shop = await Shop.findByDomain(domain, { sensitiveData: true });
```

Never expose the result of a `sensitiveData: true` call to client components.
