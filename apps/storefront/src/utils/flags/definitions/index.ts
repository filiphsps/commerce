export { accountsEnabled } from './accounts-enabled';
export { productInfoLines } from './product-info-lines';
export { searchFilter } from './search-filter';
// `sectionEnabled` is intentionally NOT re-exported here: this barrel is the Vercel Flags discovery
// source (`getProviderData(* as definitions)` in `.well-known/vercel/flags/route.ts`), which types
// every member as a concrete `KeyedFlagDefinitionType`. `sectionEnabled` is a dynamic flag *factory*
// whose per-shop `section:<id>` flags can't be statically enumerated, so consumers import it directly
// from `./section`.
