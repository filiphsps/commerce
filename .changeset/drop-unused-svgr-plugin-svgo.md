---
'react-payment-brand-icons': patch
---

Remove `@svgr/plugin-svgo` from devDependencies. The codegen scripts call
the bare `svgo` package directly and pass `svgo: false` to `@svgr/core`,
so the SVGR-side plugin was never loaded.
