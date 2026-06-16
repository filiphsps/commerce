---
'next-build-notifier': patch
---

Fix the version endpoint reporting a different id than the client baked, which left the "update available" banner stuck forever. `createVersionRoute` resolved the id via `resolveBuildId(process.env)` — passing the whole `process.env` object defeats Next's build-time inlining (it only replaces literal `process.env.X` accesses), so the baked `NEXT_PUBLIC_BUILD_ID` was invisible at runtime and the chain collapsed to an ambient runtime var or `'development'`. The default resolver now reads `process.env.NEXT_PUBLIC_BUILD_ID` directly so the endpoint reports the same id the client compares against.
