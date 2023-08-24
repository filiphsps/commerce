# sweetsideofsweden-frontend

[![Unit & Integration Testing](https://github.com/NordcomInc/sweetsideofsweden-frontend/actions/workflows/ci.yml/badge.svg)](https://github.com/NordcomInc/sweetsideofsweden-frontend/actions/workflows/ci.yml) [![Codacy Badge](https://app.codacy.com/project/badge/Grade/8f6382d655ec4ec7a240a89dcb16adfc)](https://app.codacy.com?utm_source=gh&utm_medium=referral&utm_content=&utm_campaign=Badge_grade)

A modern e-commerce platform that uses various integrations to handle everything from content management to payment to product/customer/etc data.

> [!IMPORTANT]  
> The integrations are currently hard-coded. In the future we will support integrations as plugins.

* Complete SSR-support
* Per-component testing
* Always targeting nodejs **LTS**
* npm

## Supported Integartions

* Storefronts
  - Shopify
* CMSs
  - Prismic

## Usage

1. Configure the enviroment variables specified in `next.config.js`.
2. Deploy to hosting platform of choice (e.g. Vercel).

### Dependencies

> [!NOTE]  
> This will not be necessary in the near future.

* Required by other packages
  * `@sweetsideofsweden/next-plugin-preval`: `babel-plugin-module-resolver`

## Maintainers

* 2019-2023: Filiph Siitam Sandström - [@filiphsps](https://github.com/filiphsps).
* 2023: Nordcom Group Inc. - [@NordcomInc](https://github.com/NordcomInc).
