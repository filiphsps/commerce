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
    `https://shops.nordcom.io/docs/errors/<code>/`.

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
    help: string;          // → https://shops.nordcom.io/docs/errors/<code>/
}
```

The `code` field is a discriminated union, so `switch` over it for exhaustive handling.

## Error catalogue

The hierarchy splits into two roots: `ApiError` (for failures crossing an API
boundary) and `GenericError` (for internal contract violations).

### `ApiError` family

| Class                                   | Code                                    | HTTP |
| --------------------------------------- | --------------------------------------- | ---- |
| `UnknownError`                          | `API_UNKNOWN_ERROR`                     | 500  |
| `UnknownShopDomainError`                | `API_UNKNOWN_SHOP_DOMAIN`               | 404  |
| `UnknownCommerceProviderError`          | `API_UNKNOWN_COMMERCE_PROVIDER`         | 500  |
| `UnknownContentProviderError`           | `API_UNKNOWN_CONTENT_PROVIDER`          | 500  |
| `InvalidContentProviderError`           | `API_INVALID_CONTENT_PROVIDER`          | 500  |
| `UnknownLocaleError`                    | `API_UNKNOWN_LOCALE`                    | 404  |
| `InvalidShopError`                      | `API_INVALID_SHOP`                      | 400  |
| `InvalidHandleError`                    | `API_INVALID_HANDLE`                    | 404  |
| `InvalidIDError`                        | `API_INVALID_ID`                        | 404  |
| `InvalidSliceVariationError`            | `API_INVALID_SLICE_VARIATION`           | 404  |
| `InvalidCartError`                      | `API_INVALID_CART`                      | 404  |
| `TooManyRequestsError`                  | `API_TOO_MANY_REQUESTS`                 | 429  |
| `MethodNotAllowedError`                 | `API_METHOD_NOT_ALLOWED`                | 405  |
| `ImageNoFractionalError`                | `API_IMAGE_NO_FRACTIONAL`               | 400  |
| `ImageOutOfBoundsError`                 | `API_IMAGE_OUT_OF_BOUNDS`               | 400  |
| `NoLocalesAvailableError`               | `API_NO_LOCALES_AVAILABLE`              | 500  |
| `InvalidShopifyCustomerAccountsApiConfiguration` | `API_INVALID_SHOPIFY_CUSTOMER_ACCOUNT_API_CONFIGURATION` | 500 |
| `MissingEnvironmentVariableError`       | `API_MISSING_ENVIRONMENT_VARIABLE`      | 500  |
| `ProviderFetchError`                    | `API_PROVIDER_FETCH_FAILED`             | 500  |
| `DuplicateContextDirectiveError`        | `API_SHOPIFY_GRAPHQL_DUPLICATE_CONTEXT_DIRECTIVE` | 500 |
| `DuplicateContextVariableError`         | `API_SHOPIFY_GRAPHQL_DUPLICATE_CONTEXT_VARIABLE`  | 500 |

Many constructors accept context that gets interpolated into the message — e.g.
`new InvalidHandleError('blue-shoes')` produces `The handle "blue-shoes" is invalid`.

### `GenericError` family

| Class                          | Code                            | HTTP |
| ------------------------------ | ------------------------------- | ---- |
| `GenericError`                 | `GENERIC_UNKNOWN_ERROR`         | 500  |
| `TodoError`                    | `GENERIC_TODO`                  | 404  |
| `NotFoundError`                | `NOT_FOUND`                     | 404  |
| `UnreachableError`             | `UNREACHABLE`                   | 500  |
| `TypeError`                    | `INVALID_TYPE`                  | 500  |
| `MissingContextProviderError`  | `MISSING_CONTEXT_PROVIDER`      | 500  |
| `NotConnectedToDatabase`       | `NOT_CONNECTED_TO_DATABASE`     | 500  |

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
Prismic `no documents were returned` shape.

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
