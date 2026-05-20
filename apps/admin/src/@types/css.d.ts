// Ambient module declaration for CSS side-effect imports that TypeScript
// cannot resolve via the package's export map (no `types` field in `./css`).
// `@payloadcms/ui` ships `exports["./css"]` pointing to a plain `.css` file —
// TypeScript requires an explicit module declaration to allow the import.
//
// Duplicated from `packages/cms/src/@types/css.d.ts` because admin's
// tsconfig does not include the cms package's `@types` dir, even though
// admin walks into cms source via the workspace package exports.
declare module '@payloadcms/ui/css' {}
