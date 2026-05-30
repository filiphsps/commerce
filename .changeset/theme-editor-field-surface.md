---
'@nordcom/commerce-cms': minor
---

Thread a `fieldSurface` slot and an `omitPaths` filter through the shared editor host so a route can replace the auto-rendered field tree with a bespoke editor (the admin theme editor) while keeping every dotted path live in `FormState`. `omitPaths` drops named groups from the render list only — it never touches `isHiddenEditorField`, so the omitted subtree still round-trips through save/publish.
