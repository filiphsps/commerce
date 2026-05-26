---
'react-payment-brand-icons': patch
---

Drop `scripts/` from coverage tracking. The directory holds codegen
tooling, not shipped source, and counting it toward the package's
coverage thresholds masks real gaps in `src/`.
