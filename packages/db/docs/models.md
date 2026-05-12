---
title: Models
sidebar_position: 3
---

# Models

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
