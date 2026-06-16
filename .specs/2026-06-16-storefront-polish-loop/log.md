# Storefront Polish Loop — running log

Branch `dev/storefront-polish-loop`. Each Ralph iteration takes one focused slice of the
storefront (UX/UI polish, DRY extraction, token-driven configurability, cross-engine/responsive
validation), commits logically, and pushes before the next iteration.

Guiding principles (from the task + repo design system):

- Every visual resolves from P3 semantic tokens (`--surface-*`, `--text*`, `--state-*`, …) so a
  theme-less shop renders sensibly and a tenant theme recolors the set. No hard-coded Tailwind colors.
- Pin new text-on-surface token pairs to WCAG AA in `design-tokens.gate.test.ts`.
- Break large components into reusable primitives; extract similar-intent components into generics.
- Keep JSDoc on every function/component; canonical Tailwind; American English.

## Iterations

### 1 — Alert: token-driven surfaces, legible foregrounds, a11y role

- `components/informational/alert.tsx` was the design system's outlier: hard-coded `bg-yellow-200`
  (no tenant could recolor it), and the `error` severity set a saturated `--state-danger` background
  with **no foreground**, leaving illegible dark `--text` on red. No ARIA role on urgent alerts.
- Promoted warning to themeable sources `--color-warning-light` / `--color-warning-dark` and a
  `--surface-warning` / `--text-warning-strong` token pair (mirrors the success pair) in `globals.css`.
- Reworked Alert to map each severity to a surface + explicit on-surface ink (`error` → white on
  danger, the gate-certified pairing; `warning` → warm-brown on amber; `success` → strong green ink),
  and derive an ARIA role (`alert` for warning/error, `status` otherwise), caller-overridable.
- Extended `design-tokens.gate.test.ts`: pinned the new token literals to their sources and asserted
  `--text-warning-strong` on `--surface-warning` clears WCAG AA normal.
- Verified: biome clean, storefront typecheck clean, gate (19) + blocks (18) tests pass.

#### Candidate slices for future iterations (audit backlog)

- Audit remaining hard-coded colors / non-token values across components (gate only scans a banned
  subset). Sweep `bg-yellow`, raw hex, `text-{color}-N` outside the banned set.
- `info` alert severity still uses neutral `--surface-1`; consider a dedicated info surface token.
- Verify responsive + Safari/Chromium behavior of interactive components (header mega-menu, product
  gallery lightbox, rail carousel) per the overhaul spec root-causes.
- Extract repeated card wrappers (collection/recommendation/search product cards) — confirm they are
  already thin wrappers over the product-card primitives or DRY them further.
