// TEARDOWN-02: the Payload-on-Mongo read getters (getHeader/getPage/…)
// are gone — the storefront reads CMS content straight from the Convex
// `cms/read` functions. The pure link resolver is the only surviving
// member of this entry point.
export { type LinkValue, type LocaleRef, resolveLink } from './resolve-link';
