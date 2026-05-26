---
'react-payment-brand-icons': patch
---

Minify SVG markup at codegen time so each generated icon component ships
the smallest possible inline JSX. Source `.svg` files in `svgs/` are
untouched — the optimization runs only on the in-memory string handed to
SVGR. Lets the build pipeline avoid babel-generator's pretty-print path
for any icon whose inline content would otherwise tip past 500 KB.
