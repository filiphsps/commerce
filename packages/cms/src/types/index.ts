// Re-exports the Payload-generated types from the canonical
// `payload-types.ts` artifact so consumers can import them without reaching
// into internal paths. Regenerate via `pnpm --filter @nordcom/commerce-cms
// payload generate:types` whenever a collection schema changes.
export type * from './payload-types';
