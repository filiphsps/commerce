// Ambient module declaration for CSS side-effect imports that TypeScript
// cannot resolve via the package's export map (no `types` field in `./css`).
// @payloadcms/ui ships `exports["./css"]` pointing to a plain `.css` file —
// TypeScript requires an explicit module declaration to allow the import.
declare module '@payloadcms/ui/css' {}
