---
'react-payment-brand-icons': patch
---

<!-- cspell:ignore krungthaibank omise -->

Replace `svgs/krungthaibank.svg`'s embedded raster PNG with a vector logo
sourced from omise/banks-logo (MIT). The generated icon drops from ~515 KB
to ~3 KB and no longer trips babel-generator's 500 KB pretty-print
de-optimization at codegen time. Attribution lives in `NOTICE.md`.
