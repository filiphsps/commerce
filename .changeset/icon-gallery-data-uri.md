---
'react-payment-brand-icons': patch
---

Inline each icon's SVG as a `data:` URI in the generated `docs/icons.mdx` so
the page still resolves images after `apps/docs/scripts/mirror-workspace-docs.ts`
mirrors it into `apps/docs/app/docs/(generated)/…`. The mirror only copies
`.md(x)` files, so the previous `<img src="../svgs/<filename>">` 404'd at the
mirrored URL. Keeping the markup as plain `<img>` also avoids MDX trying to
parse SVG attributes like `xmlns:xlink` as JSX.
