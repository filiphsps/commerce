# Shoppy

[![Unit & Integration Testing](https://github.com/sweet-side-of-sweden/sweetsideofsweden-frontend/actions/workflows/test.yml/badge.svg)](https://github.com/sweet-side-of-sweden/sweetsideofsweden-frontend/actions/workflows/test.yml) [![Codacy Badge](https://app.codacy.com/project/badge/Grade/8f6382d655ec4ec7a240a89dcb16adfc)](https://app.codacy.com?utm_source=gh&utm_medium=referral&utm_content=&utm_campaign=Badge_grade)

Shoppy is a modern implementation of a B2C storefront.

* Complete SSR-support
* Per-component testing
* Always targeting nodejs **LTS**
* npm

## Usage

1. Configure the values specificed in `next.config.js`. For example:

```bash
STORE=hello.myshopify.com
DOMAIN=my-example-store.com
```

2. Deploy to platform of choice.

## Good-to-remember links

[prismic-next](https://prismic.io/docs/technical-reference/prismicio-next)

## Generating i18n

**Make sure `en-US` and `USD` are the first ones**

```typescript
console.log([...new Set(locales.flatMap((loc) => loc.map((c) => c.currency)))].join(','));
console.log([...new Set(locales.flatMap((loc) => loc.map((c) => c.locale)))].join(','));
```

## Maintainers

* 2019-2023 - Filiph Siitam Sandström - @filiphsps.
