// Re-exports the descriptor-generated content types from the canonical
// `content-types.ts` artifact so consumers can import them without reaching
// into internal paths. The artifact is committed to keep CI builds
// deterministic — regenerate via `pnpm cms:gen` whenever a field shape
// changes and commit the diff alongside your source edit.
export type * from './content-types';
