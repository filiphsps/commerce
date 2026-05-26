---
'react-payment-brand-icons': patch
---

Re-serialize every source SVG in `svgs/` with two-space indentation so the
checked-in files are human-readable. Pure formatting pass — `scripts/prettify-source-svgs.ts`
runs SVGO with an empty plugin pipeline, so node structure, attribute values,
and ids are preserved byte-for-byte aside from whitespace.
