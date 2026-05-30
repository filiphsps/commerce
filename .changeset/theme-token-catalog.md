---
'@nordcom/commerce-db': minor
---

Add the theme-token catalog (`THEME_TOKEN_CATALOG`, `deriveCatalog`, `productCardCustomProperty`) and the pure isomorphic `serializeThemeToCssVars` serializer beside `resolveTheme`/`THEME_DEFAULTS`, so the admin theme editor, the fallback field builder, and the storefront SSR render iterate one source of truth and compute the same CSS-variable output.
