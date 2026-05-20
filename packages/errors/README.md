# `@nordcom/commerce-errors`

A typed, code-tagged error hierarchy used everywhere in the Nordcom Commerce monorepo.
Every error has a stable `code` (so it can be matched safely across boundaries) and
a `help` URL that points at user-facing documentation.

## Why

Throwing strings or generic `Error` instances loses information at every hop. This
package gives the platform a shared vocabulary for failures:

-   **Stable codes** like `API_UNKNOWN_SHOP_DOMAIN` survive serialization and can be
    matched by HTTP handlers, middleware, and tests.
-   **Semantic subclasses** (`NotFoundError`, `InvalidHandleError`, `TooManyRequestsError`)
    let callers branch on the *kind* of failure without parsing strings.
-   **HTTP-mapped `statusCode`** lets API routes turn any thrown error into the right
    response with a single `error.statusCode ?? 500`.
-   **Self-documenting:** every error exposes a `help` URL pointing at
    `https://${SERVICE_DOMAIN}/docs/errors/<code>/`.

## Install

```jsonc
{
    "dependencies": {
        "@nordcom/commerce-errors": "workspace:*"
    }
}
```

## Usage

```ts
import {
    Error,
    NotFoundError,
    InvalidHandleError,
    UnknownShopDomainError,
} from '@nordcom/commerce-errors';

throw new NotFoundError('Product');
//          ↑ details / description / code / statusCode are pre-populated.

throw new InvalidHandleError('blue-shoes');
//                            ↑ interpolated into the description.

// Match on type.
try {
    await fetchSomething();
} catch (error) {
    if (Error.isNotFound(error)) {
        return notFound();
    }
    if (error instanceof UnknownShopDomainError) {
        return rewriteToServiceDomain();
    }
    throw error;
}
```

### Anatomy of an error

```ts
class Error<TCode = unknown> extends globalThis.Error {
    name: string;          // e.g. 'InvalidHandleError'
    details: string;       // short, user-presentable summary
    description: string;   // longer message (may interpolate context)
    code: TCode;           // ApiErrorKind | GenericErrorKind
    statusCode?: number;   // HTTP status (404, 400, 500, …)
    help: string;          // → https://${SERVICE_DOMAIN}/docs/errors/<code>/
}
```

The `code` field is a discriminated union, so `switch` over it for exhaustive handling.

## Error catalogue

The hierarchy splits into two roots: `ApiError` (for failures crossing an API
boundary) and `GenericError` (for internal contract violations).

Many constructors accept context that gets interpolated into the message — e.g.
`new InvalidHandleError('blue-shoes')` produces `The handle "blue-shoes" is invalid`.

## Helpers

```ts
import { Error, getAllErrorCodes, getErrorFromCode } from '@nordcom/commerce-errors';

// Test for a "not found"-shaped error regardless of class.
Error.isNotFound(error);

// Resolve a class from a code (e.g. when rehydrating a serialized error).
const ErrCtor = getErrorFromCode('API_UNKNOWN_SHOP_DOMAIN');
//    ↑ → UnknownShopDomainError

// List every known code (useful for docs / OpenAPI generators).
getAllErrorCodes();
```

`Error.isNotFound` returns `true` for `NotFoundError`, `InvalidHandleError`,
`InvalidIDError`, `UnknownLocaleError`, anything with `statusCode === 404`, and the

## Adding a new error

1.  Add the code to either `ApiErrorKind` or `GenericErrorKind` in `src/index.ts`.
2.  Create a class extending the appropriate parent (`ApiError` or `GenericError`).
    Set `name`, `details`, `description`, `code`, and `statusCode` as fields.
3.  Add the code → class mapping inside `getErrorFromCode`.
4.  Run `pnpm build` so consumers pick up the new types.

If the error needs to interpolate context (a handle, an id, an operation name),
mirror the pattern in `InvalidHandleError` / `DuplicateContextDirectiveError`:
override the constructor and rewrite the `description` in place.

## Scripts

```bash
pnpm build       # tsc + vite build (emits to dist/)
pnpm typecheck   # tsc -noEmit
pnpm lint        # biome lint .
pnpm clean       # rm dist / .turbo / coverage / etc.
```
