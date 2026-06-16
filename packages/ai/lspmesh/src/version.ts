// Replaced at build time with the package.json version (see vite.config define).
// The fallback covers unit tests, which run the source without the define.
declare const __LSPMESH_VERSION__: string;

/** Current lspmesh version. Single source for the bin, MCP server, and barrel. */
export const LSPMESH_VERSION: string = typeof __LSPMESH_VERSION__ === 'string' ? __LSPMESH_VERSION__ : '0.0.0';
