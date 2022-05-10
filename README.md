# snushof-frontend-nextjs

![Unit & Integration Testing](https://github.com/snushof-ab/techhof-frontend-nextjs/workflows/Unit%20&%20Integration%20Testing/badge.svg?branch=master)

snushof-frontend-nextjs is a modern implementation of a B2C storefront.

* Complete SSR-support
* Per-component testing
* Always targeting **lts** nodejs (currently **16.x**)
* Yarn

## Usage

1. Configure the STORE and DOMAIN values (In HEROKU its Settings->Config Vars).

```bash
STORE=snushof.myshopify.com
DOMAIN=snushof.ch
NEXT_PUBLIC_DEFAULT_LANGUAGE=en_US

# shopify storefront
TYPE=shopify-storefront
```

2. Deploy to platform of choice.

## Maintainers

* 2019-2022 - Filiph Sandström.
