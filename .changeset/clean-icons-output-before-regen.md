---
"react-payment-brand-icons": patch
---

Wipe the generated `icons/` output directory before re-emitting. A removed or renamed SVG — or a stale module from an earlier generator that emitted a different file extension — could otherwise linger and be picked up by the extensionless icon imports (vite resolves `.js` ahead of `.tsx`, so an orphan JSX-bearing `.js` broke the build locally).
