---
title: Locales
sidebar_position: 5
---

# Locales

`Locale` (`src/utils/locale/locale.ts`) is the canonical locale type — a class with a
`code` like `en-US`. **Never hand-build locale strings.**

```ts
import { Locale } from '@/utils/locale/locale';

Locale.default;                  // → en-US, for shop-less contexts (build, tests, sitemaps)
Locale.fallbackForShop(shop);    // → shop.i18n.defaultLocale — for shop-aware retry/fallback
```

UI strings live in `src/locales/{en,sv,de,es,fr,no}.json` and are loaded via
`getDictionary()`.
