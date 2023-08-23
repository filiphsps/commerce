# sweetsideofsweden-frontend

[![Unit & Integration Testing](https://github.com/NordcomInc/sweetsideofsweden-frontend/actions/workflows/ci.yml/badge.svg)](https://github.com/NordcomInc/sweetsideofsweden-frontend/actions/workflows/ci.yml) [![Codacy Badge](https://app.codacy.com/project/badge/Grade/8f6382d655ec4ec7a240a89dcb16adfc)](https://app.codacy.com?utm_source=gh&utm_medium=referral&utm_content=&utm_campaign=Badge_grade)

This is a modern implementation of a direct to consumer storefront.

* Complete SSR-support
* Per-component testing
* Always targeting nodejs **LTS**
* npm

## Usage

1. Configure the values specified in `next.config.js`. For example:

```bash
STORE=hello.myshopify.com
DOMAIN=my-example-store.com
```

2. Deploy to platform of choice.

### Dependencies

* Required by other packages
  * `@sweetsideofsweden/next-plugin-preval`: `babel-plugin-module-resolver`

## Maintainers

* 2019-2023 - Filiph Siitam Sandström - @filiphsps.
