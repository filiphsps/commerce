import type { Payload } from 'payload';

/**
 * The storefront's `LocaleRef.code` is typed as `string` (any locale
 * identifier). Payload's typegen narrows the param to the union of
 * currently-configured locales. Runtime correctness is ensured by
 * `LocaleRef` construction; this cast acknowledges the type-system gap
 * without forcing a refactor of every locale consumer.
 *
 * Centralized so the boundary is greppable — replace these aliases with
 * a typed locale enum across `LocaleRef` and the storefront and the
 * cast sites stop carrying the comment-of-shame.
 */
export type FindLocale = Parameters<Payload['find']>[0]['locale'];
export type FindFallbackLocale = Parameters<Payload['find']>[0]['fallbackLocale'];
