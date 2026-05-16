// Re-exports the Payload-generated types from the canonical
// `payload-types.ts` artifact so consumers can import them without reaching
// into internal paths. The artifact is committed to keep CI builds
// deterministic — regenerate via `pnpm generate:types` whenever a
// collection schema changes and commit the diff alongside your source edit.
export type * from './payload-types';
