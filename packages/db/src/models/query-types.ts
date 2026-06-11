/**
 * Dependency-free structural replacements for the Mongoose query-type vocabulary the SFREAD-02
 * service-seam contract pins (`ProjectionType` / `QueryFilter` / `QueryOptions` / `UpdateQuery`).
 * TEARDOWN-04 removed `mongoose` from the dependency graph, but the frozen seam signatures keep
 * this argument vocabulary, so the names live on here as local aliases. The Convex backends consume
 * every one of them opaquely (cast to `Record<string, unknown>` and matched against the handful of
 * shapes callers actually pass), so the aliases only need to ACCEPT the frozen call-site shapes:
 * plain field filters (`{ email }`), Mongo operator objects (`{ identities: { $elemMatch } }`,
 * `{ $push }`), dotted projection paths (`{ 'i18n.defaultLocale': 1 }`), and legacy driver options
 * (`{ lean, upsert, new }`).
 */

/**
 * A document-keyed open record: known fields of `DocType` stay nameable for readability and
 * editor completion, while the index signature keeps the Mongo operator/dotted-path vocabulary
 * (`$elemMatch`, `'i18n.defaultLocale'`, `_id`) assignable.
 */
type OpenDocRecord<DocType> = { [Field in keyof DocType]?: unknown } & Record<string, unknown>;

/** Seam query filter selecting documents: plain field equality or Mongo operator objects. */
export type QueryFilter<DocType> = OpenDocRecord<DocType>;

/** Field projection: a space-separated path string or an include/exclude map (dotted paths allowed). */
export type ProjectionType<DocType> = string | OpenDocRecord<DocType>;

/**
 * Read/update options carried for the frozen signatures. `lean` and `new` are inert on the Convex
 * backends (they always return plain rows); `upsert: true` is honored by `findOneAndUpdate`.
 */
export type QueryOptions<DocType> = {
    lean?: boolean;
    new?: boolean;
    upsert?: boolean;
    projection?: ProjectionType<DocType>;
} & Record<string, unknown>;

/** Update expression: a flat partial document or Mongo update operators such as `$push`/`$set`. */
export type UpdateQuery<DocType> = OpenDocRecord<DocType>;

/** Sort directions the seam's `find` vocabulary accepts. */
export type SortOrder = 1 | -1 | 'asc' | 'ascending' | 'desc' | 'descending';

/**
 * Sort specification for `Service.find`: a path string, a path→order map, or ordered path/order
 * pairs. Inert on the Convex backends (no caller passes one) but part of the frozen `find` shape.
 */
export type SortSpec = string | Record<string, SortOrder> | [string, SortOrder][] | null;

/**
 * Structural stand-in for the Mongo `ObjectId` arm of historical unpopulated refs
 * (`FeatureFlagRef['flag']`). Consumers narrow refs by shape (`'key' in flag`), never through the
 * ObjectId class, so only the id-rendering surface is kept.
 */
export interface LegacyObjectIdRef {
    toHexString(): string;
}
