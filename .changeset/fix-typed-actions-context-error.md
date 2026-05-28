---
'@nordcom/cart-next': patch
---

Fix uncaught `CartProviderError` escaping the Server Action boundary. `resolveContext()` was called before the try/catch in `run()`, so any context-resolution failure (missing request headers, DB error) bubbled as a raw unhandled exception instead of returning `{ ok: false, reason: 'provider-error' }`. Moved `resolveContext` inside the try block so all failure modes are handled uniformly.
