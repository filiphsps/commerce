# `@nordcom/commerce-shopify-graphql`

Apollo `DocumentTransform` that injects Shopify's `@inContext(country, language)`
directive into every operation, plus the corresponding `$country` / `$language`
variable definitions.

If you've ever written this by hand on every Storefront API query, this package
deletes that boilerplate.

## Why

The Shopify Storefront API uses the `@inContext` directive to scope responses to a
country and language. Every query and mutation in a multi-tenant storefront needs it,
but adding it by hand is repetitive, error-prone, and easy to forget on a new
operation. This transform hooks into Apollo Client's `documentTransform` pipeline
and does it once, at the network layer, for every request.

```graphql
# What you write:
query Products {
    products(first: 10) { edges { node { id } } }
}

# What Shopify sees:
query Products($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    products(first: 10) { edges { node { id } } }
}
```

## Install

```jsonc
{
    "dependencies": {
        "@nordcom/commerce-shopify-graphql": "workspace:*"
    },
    "peerDependencies": {
        "@apollo/client": "^3.13.0 || ^4.0.0",
        "graphql": "^16.0.0"
    }
}
```

## Usage

Pass `inContextTransform` to your Apollo Client as the `documentTransform`:

```ts
import { ApolloClient, InMemoryCache, HttpLink } from '@apollo/client';
import { inContextTransform } from '@nordcom/commerce-shopify-graphql';

const client = new ApolloClient({
    link: new HttpLink({ uri: 'https://<store>.myshopify.com/api/2026-01/graphql.json' }),
    cache: new InMemoryCache(),
    documentTransform: inContextTransform,
});

// Then provide the variables at query time.
client.query({
    query: PRODUCTS_QUERY,                    // unmodified — no @inContext needed
    variables: { country: 'US', language: 'EN' },
});
```

That's it — every operation that passes through this client picks up `$country`,
`$language`, and `@inContext` automatically.

## Contract

The transform is intentionally strict. **Source operations must not pre-declare**
`@inContext` or the `$country` / `$language` variables — the transform owns them.
If it sees either, it throws (so the bug surfaces in development instead of at the
Shopify edge):

| Condition                                              | Error                              |
| ------------------------------------------------------ | ---------------------------------- |
| Operation already has an `@inContext` directive        | `DuplicateContextDirectiveError`   |
| Operation declares `$country` or `$language` variable  | `DuplicateContextVariableError`    |

Both errors include the operation name (or `<anonymous query>` / `<anonymous mutation>`
when unnamed) in the description so it's clear which one to fix.

```ts
// ✗ Throws DuplicateContextDirectiveError('Products')
query Products($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) { … }

// ✗ Throws DuplicateContextVariableError('Products', 'country')
query Products($country: CountryCode!) { … }

// ✓ Fine — transform will add the directive and variables.
query Products { products(first: 10) { edges { node { id } } } }
```

## What it does

For every `OperationDefinitionNode` (queries, mutations, subscriptions):

1.  Refuses to run if an `@inContext` directive is already present.
2.  Refuses to run if `$country` or `$language` is already declared.
3.  Appends:
    -   `$country: CountryCode`
    -   `$language: LanguageCode`
    -   `@inContext(country: $country, language: $language)`

Non-operation definitions (fragments, schema definitions) are passed through unchanged.

## Layout

```text
packages/shopify-graphql/
└── src/
    ├── index.ts                       # Public re-export
    ├── in-context-transform.ts        # The DocumentTransform
    └── in-context-transform.test.ts   # Vitest suite (queries, mutations, error paths)
```

## Scripts

```bash
pnpm build       # tsc + vite build (emits to dist/)
pnpm typecheck   # tsc -noEmit
pnpm lint        # biome lint .
pnpm test        # vitest run
pnpm clean       # rm dist / .turbo / coverage / etc.
```

## Notes

-   This package depends on `@nordcom/commerce-errors` for the two thrown error classes.
-   `Error.isError()` checks via `name` rather than `instanceof` — the `BuiltinError`
    base in `commerce-errors` calls `Object.setPrototypeOf(this, Error.prototype)`,
    which collapses the prototype chain for subclasses. The tests work around this
    by asserting on `name` and `description` (see `in-context-transform.test.ts`).
